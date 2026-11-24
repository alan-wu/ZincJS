import { Matrix4 } from 'three/webgpu';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Geometry } from '../primitives/geometry';
import { Glyphset } from '../primitives/glyphset';
import { Lines } from '../primitives/lines';
import { Pointset } from '../primitives/pointset';
import { applyMorphColorNode } from '../tsl/morphColorMaterial';

/*
 * Node types written by SceneExporter into extras.zinc.
 */
const REGION_TYPES = ['region', 'rootRegion'];

const getZincMetadata = (object) => {
  const zinc = object.userData ? object.userData.zinc : undefined;
  return zinc && typeof zinc === 'object' && zinc.type ? zinc : undefined;
};

const isRenderable = (object) =>
  object.type === 'Mesh' || object.type === 'LineSegments' || object.type === 'Points';

const findRenderable = (object) => {
  if (isRenderable(object)) return object;
  for (const child of object.children) {
    const found = findRenderable(child);
    if (found) return found;
  }
  return undefined;
};

/*
 * Transformation of object relative to the node mapped to its zinc region.
 */
const getRelativeMatrix = (regionNode, object) => {
  return new Matrix4().copy(regionNode.matrixWorld).invert().multiply(object.matrixWorld);
};

const IDENTITY = new Matrix4();

const GLYPHSET_FRAMES = ['positions', 'axis1', 'axis2', 'axis3', 'scale', 'colors'];

/*
 * Read the glyphset data written by SceneExporter's GLTFGlyphsetPlugin back
 * into the format used by Glyphset.load. Returns a map of the glTF objects
 * to their glyphset data.
 */
const resolveGlyphsets = async (gltf) => {
  const glyphsets = new Map();
  if (!gltf.parser) return glyphsets;
  const pending = [];
  gltf.scene.traverse((object) => {
    const metadata = getZincMetadata(object);
    if (metadata && metadata.type === 'glyphset' && metadata.glyphset) {
      pending.push(object);
    }
  });
  for (const object of pending) {
    const source = object.userData.zinc.glyphset;
    const data = {
      metadata: { ...source.metadata },
      label: source.label,
      displayLabels: source.displayLabels,
      globalScale: source.globalScale,
    };
    for (const name of GLYPHSET_FRAMES) {
      if (source[name]) {
        data[name] = {};
        for (const key in source[name]) {
          const attribute = await gltf.parser.getDependency('accessor', source[name][key]);
          const array = attribute.array;
          if (name === 'colors') {
            const hexes = new Array(attribute.count);
            for (let i = 0; i < attribute.count; i++) {
              hexes[i] =
                (Math.round(array[i * 3] * 255) << 16) |
                (Math.round(array[i * 3 + 1] * 255) << 8) |
                Math.round(array[i * 3 + 2] * 255);
            }
            data[name][key] = hexes;
          } else {
            data[name][key] = Array.from(array);
          }
        }
      }
    }
    glyphsets.set(object, data);
  }
  return glyphsets;
};

/**
 * Load a glTF file into zinc regions and zinc objects.
 *
 * Files exported by {@link SceneExporter} carry zinc information in the
 * "extras.zinc" of their nodes, it is used to restore the regions, groupNames,
 * anatomicalIds and durations. Other glTF files are loaded with named nodes
 * mapped to regions and each mesh, line segments and points mapped to a zinc
 * object.
 *
 * @class
 * @author Alan Wu
 * @return {GLTFToZincJSLoader}
 */
const GLTFToZincJSLoader = function () {
  const _this = this;

  /*
   * glTF stores morph targets as offsets from the base attribute and
   * GLTFLoader keeps them that way (morphTargetsRelative), but zinc expects
   * absolute morph targets. GLTFLoader also only keeps the target names in
   * morphTargetDictionary, while zinc builds its animation clip from the
   * attribute names, so copy the names back onto the attributes.
   */
  const convertMorphTargets = (object) => {
    const geometry = object.geometry;
    if (!geometry || !geometry.morphAttributes) return;
    const names = [];
    if (object.morphTargetDictionary) {
      for (const key in object.morphTargetDictionary) {
        names[object.morphTargetDictionary[key]] = key;
      }
    }
    for (const attributeName in geometry.morphAttributes) {
      const base = geometry.attributes[attributeName];
      geometry.morphAttributes[attributeName].forEach((attribute, i) => {
        if (geometry.morphTargetsRelative && base) {
          const array = attribute.array;
          const baseArray = base.array;
          const length = Math.min(array.length, baseArray.length);
          for (let j = 0; j < length; j++) {
            array[j] += baseArray[j];
          }
          attribute.needsUpdate = true;
        }
        if (names[i] !== undefined) attribute.name = names[i];
      });
    }
    geometry.morphTargetsRelative = false;
  };

  /*
   * Zinc renders colour morphs with its own colorNode (see geometry.js and
   * lines.js), so swap it into the materials GLTFLoader created. Without it
   * the colours stay at the first frame.
   */
  const applyMorphColourMaterial = (object) => {
    const setup = (material) => {
      //Same as geometry.js - vertexColors would multiply the blend by the
      //static colour attribute.
      material.vertexColors = false;
      return applyMorphColorNode(material);
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(setup)
      : setup(object.material);
  };

  const setRegionTransformation = (region, regionNode, object) => {
    const matrix = getRelativeMatrix(regionNode, object);
    //Keep the existing transformation of the region if there is none
    if (!matrix.equals(IDENTITY)) {
      region.setTransformation(matrix.transpose().elements);
    }
  };

  /*
   * Create a zinc object from a mesh, line segments or points, metadata is
   * the extras.zinc of the node exported by SceneExporter if available.
   */
  const createZincObject = (object, region, regionNode, metadata, finishCallback) => {
    let zincObject = undefined;
    if (object.type === 'Mesh') {
      zincObject = new Geometry();
    } else if (object.type === 'LineSegments') {
      zincObject = new Lines();
    } else if (object.type === 'Points') {
      zincObject = new Pointset();
    }
    if (!zincObject) return;
    let localTimeEnabled = false;
    let localMorphColour = false;
    if (object.geometry && object.geometry.morphAttributes) {
      convertMorphTargets(object);
      localTimeEnabled = object.geometry.morphAttributes.position ? true : false;
      localMorphColour = object.geometry.morphAttributes.color ? true : false;
    }
    if (metadata) {
      //Colour only animations are exported with static position targets
      if (metadata.timeEnabled === false) localTimeEnabled = false;
      if (metadata.morphColour === false) localMorphColour = false;
    }
    if (zincObject.isLines) {
      //Same as lines loaded from json, a clone of THREE.LineSegments would
      //lose the morph targets bindings - Line.copy does not copy them.
      zincObject.createLineSegment(object.geometry, object.material, {
        localTimeEnabled,
        localMorphColour,
      });
    } else {
      //Children are loaded separately
      const mesh = object.clone(false);
      if (localMorphColour && !zincObject.isPointset) applyMorphColourMaterial(mesh);
      zincObject.setMesh(mesh, localTimeEnabled, localMorphColour);
    }
    const morph = zincObject.getMorph();
    if (!morph) return;
    morph.name = object.name;
    //Include the transformations of the nodes between the region and object
    getRelativeMatrix(regionNode, object).decompose(morph.position, morph.quaternion, morph.scale);
    morph.matrixAutoUpdate = true;
    const groupName =
      metadata && metadata.groupName !== undefined ? metadata.groupName : morph.name;
    zincObject.setName(groupName);
    region.addZincObject(zincObject);
    if (metadata) {
      if (metadata.anatomicalId !== undefined) zincObject.setAnatomicalId(metadata.anatomicalId);
      if (metadata.duration !== undefined) zincObject.setDuration(metadata.duration);
    }
    if (finishCallback != undefined && typeof finishCallback == 'function')
      finishCallback(zincObject);
  };

  /*
   * Recreate the glyphset from the data written by SceneExporter, the
   * instanced mesh provides the geometry and material of the glyph.
   */
  const createGlyphset = (object, region, regionNode, metadata, data, finishCallback) => {
    const glyphset = new Glyphset();
    //Used as the default label of the glyphs
    if (metadata.groupName !== undefined) glyphset.groupName = metadata.groupName;
    if (data.globalScale !== undefined) glyphset.globalScale = data.globalScale;
    if (metadata.duration !== undefined) glyphset.setDuration(metadata.duration);
    const geometry = object.geometry.clone();
    //The glyph only has vertex colours when its material uses them
    const material = object.material.clone();
    material.vertexColors = geometry.getAttribute('color') !== undefined;
    glyphset.loadFromGeometry(data, geometry, material, undefined, !!data.displayLabels);
    const morph = glyphset.getMorph();
    getRelativeMatrix(regionNode, object).decompose(morph.position, morph.quaternion, morph.scale);
    morph.updateMatrix();
    if (metadata.groupName !== undefined) glyphset.setName(metadata.groupName);
    region.addZincObject(glyphset);
    if (metadata.anatomicalId !== undefined) glyphset.setAnatomicalId(metadata.anatomicalId);
    if (finishCallback != undefined && typeof finishCallback == 'function')
      finishCallback(glyphset);
  };

  /*
   * Parse a node of the glTF scene, regionNode is the node mapped to region.
   */
  const parseNode = (object, region, regionNode, finishCallback, glyphsets) => {
    let childRegion = region;
    let childRegionNode = regionNode;
    const metadata = getZincMetadata(object);
    if (metadata) {
      if (REGION_TYPES.includes(metadata.type)) {
        if (metadata.type === 'region') {
          const name = metadata.name ? metadata.name : object.userData.name || object.name;
          childRegion = region.getChildWithName(name);
          if (!childRegion) childRegion = region.createChild(name);
          if (metadata.duration !== undefined && metadata.duration !== childRegion.getDuration()) {
            childRegion.setDuration(metadata.duration);
          }
        }
        setRegionTransformation(childRegion, regionNode, object);
        childRegionNode = object;
      } else {
        //A zinc object, its node and descendants are consumed here
        const renderable = findRenderable(object);
        const glyphsetData = glyphsets ? glyphsets.get(object) : undefined;
        if (renderable && glyphsetData) {
          createGlyphset(renderable, region, regionNode, metadata, glyphsetData, finishCallback);
        } else if (renderable) {
          createZincObject(renderable, region, regionNode, metadata, finishCallback);
        }
        return;
      }
    } else if (isRenderable(object)) {
      createZincObject(object, region, regionNode, undefined, finishCallback);
    } else if (object.type === 'Object3D' && object.name !== '') {
      childRegion = region.findOrCreateChildFromPath(object.name);
      if (childRegion) {
        setRegionTransformation(childRegion, regionNode, object);
        childRegionNode = object;
      } else {
        childRegion = region;
      }
    }
    object.children.forEach((child) => {
      parseNode(child, childRegion, childRegionNode, finishCallback, glyphsets);
    });
  };

  /**
   * Parse the objects loaded by GLTFLoader into region.
   *
   * @param {THREE.Object3D} object - Object to be parsed, usually the scene
   * of the loaded glTF.
   * @param {Region} region - Region to load the objects into.
   * @param {Number} depth - Use 0 when object is the scene of the glTF, it
   * is mapped to region. Otherwise, object itself is parsed as well.
   * @param {Function} finishCallback - Called with each zinc object created.
   * @param {Map} glyphsets - Glyphset data of the objects, see
   * {@link GLTFToZincJSLoader#parseGLTF}. Glyphsets are loaded as static
   * geometries without it.
   */
  this.parseGLTFObjects = (object, region, depth, finishCallback, glyphsets) => {
    object.updateMatrixWorld(true);
    if (depth !== 0) {
      parseNode(object, region, object.parent ? object.parent : object, finishCallback, glyphsets);
    } else {
      object.children.forEach((child) => {
        parseNode(child, region, object, finishCallback, glyphsets);
      });
    }
  };

  /**
   * Parse a glTF loaded by GLTFLoader into region, including the glyphsets
   * exported by {@link SceneExporter}.
   *
   * @param {Object} gltf - Result of GLTFLoader.
   * @param {Region} region - Region to load the objects into.
   * @param {Function} finishCallback - Called with each zinc object created.
   * @param {Function} isCancelled - Optional function returning true if this
   * load has been cancelled.
   * @return {Promise<Boolean>} Resolves to false if it has been cancelled.
   */
  this.parseGLTF = async (gltf, region, finishCallback, isCancelled) => {
    const glyphsets = await resolveGlyphsets(gltf);
    if (isCancelled && isCancelled()) return false;
    _this.parseGLTFObjects(gltf.scene, region, 0, finishCallback, glyphsets);
    return true;
  };

  this.setCamera = (scene) => {
    scene.viewAll();
    const cameraControls = scene.getZincCameraControls();
    const viewport = cameraControls.getCurrentViewport();
    cameraControls.addViewport('default', viewport);
    cameraControls.setDefaultViewport('default');
  };

  /**
   * Load GLTF into this scene object.
   *
   * @param {String} url - URL to the GLTF file
   * @param {Function} finishCallback - Callback function which will be called
   * once the glyphset is succssfully load in.
   * @param {Function} allCompletedCallback - Called once everything is loaded
   * or the load has failed.
   * @param {Object} options - Set options.viewAll to false to keep the
   * current viewport.
   * @param {Function} isCancelled - Optional function returning true if this
   * load has been cancelled, the loaded content will be discarded.
   */
  this.load = (scene, region, url, finishCallback, allCompletedCallback, options, isCancelled) => {
    const path = url.substring(0, url.lastIndexOf('/') + 1);
    const filename = url.substring(url.lastIndexOf('/') + 1, url.length);
    const loader = new GLTFLoader().setPath(path);
    const allCompleted = () => {
      if (allCompletedCallback != undefined && typeof allCompletedCallback == 'function')
        allCompletedCallback();
    };

    const onError = (error) => {
      if (isCancelled && isCancelled()) return;
      console.error(`There is an issue loading the glTF file: ${url}.`, error);
      if (finishCallback != undefined && typeof finishCallback == 'function')
        finishCallback({ type: 'Error', error });
      allCompleted();
    };

    loader.load(
      filename,
      function (gltf) {
        if (isCancelled && isCancelled()) return;
        _this
          .parseGLTF(gltf, region, finishCallback, isCancelled)
          .then((completed) => {
            if (!completed) return;
            if (!options || options.viewAll !== false) _this.setCamera(scene);
            allCompleted();
          })
          .catch(onError);
      },
      undefined,
      onError,
    );
  };
};

export { GLTFToZincJSLoader };
