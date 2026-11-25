import { BufferAttribute, BufferGeometry, Matrix4, Mesh, Vector3, Vector4 } from 'three/webgpu';
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

//Line strips (Line) and line loops are converted to line segments
const isLines = (object) =>
  object.type === 'LineSegments' || object.type === 'Line' || object.type === 'LineLoop';

//Skinned meshes are loaded in the pose of the file, without their skeleton
const isMesh = (object) => object.type === 'Mesh' || object.type === 'SkinnedMesh';

const isRenderable = (object) => isMesh(object) || isLines(object) || object.type === 'Points';

/*
 * Create a mesh with the vertices and normals of a skinned mesh moved by
 * its bones in their current pose, zinc does not support skeletons. Morph
 * targets must be absolute, they are moved the same way.
 */
const bakeSkinnedMesh = (object) => {
  const source = object.geometry;
  const geometry = new BufferGeometry();
  geometry.name = source.name;
  geometry.setIndex(source.index);
  const position = new Vector3();
  const direction = new Vector4();
  const bake = (attribute, isDirection) => {
    const baked = new BufferAttribute(new Float32Array(attribute.count * 3), 3);
    baked.name = attribute.name;
    for (let i = 0; i < attribute.count; i++) {
      if (isDirection) {
        direction.set(attribute.getX(i), attribute.getY(i), attribute.getZ(i), 0);
        object.applyBoneTransform(i, direction);
        position.set(direction.x, direction.y, direction.z).normalize();
      } else {
        position.fromBufferAttribute(attribute, i);
        object.applyBoneTransform(i, position);
      }
      baked.setXYZ(i, position.x, position.y, position.z);
    }
    return baked;
  };
  for (const name in source.attributes) {
    const attribute = source.attributes[name];
    if (name === 'position') geometry.setAttribute(name, bake(attribute, false));
    else if (name === 'normal') geometry.setAttribute(name, bake(attribute, true));
    else if (name !== 'skinIndex' && name !== 'skinWeight') geometry.setAttribute(name, attribute);
  }
  for (const name in source.morphAttributes) {
    geometry.morphAttributes[name] = source.morphAttributes[name].map((attribute) => {
      if (name === 'position') return bake(attribute, false);
      if (name === 'normal') return bake(attribute, true);
      return attribute;
    });
  }
  geometry.morphTargetsRelative = false;
  source.groups.forEach((group) => {
    geometry.addGroup(group.start, group.count, group.materialIndex);
  });
  const mesh = new Mesh(geometry, object.material);
  mesh.name = object.name;
  return mesh;
};

/*
 * Geometry of the lines of object as non indexed line segments, which is
 * what zinc lines use. Line strips connect each vertex to the next one and
 * line loops also connect the last vertex to the first one.
 */
const toLineSegmentsGeometry = (object) => {
  const geometry = object.geometry;
  const source = geometry.index;
  if (object.type === 'LineSegments' && !source) return geometry;
  const position = geometry.getAttribute('position');
  const count = source ? source.count : position.count;
  const vertex = (i) => (source ? source.getX(i) : i);
  const indices = [];
  if (object.type === 'LineSegments') {
    for (let i = 0; i < count; i++) indices.push(vertex(i));
  } else {
    for (let i = 0; i + 1 < count; i++) indices.push(vertex(i), vertex(i + 1));
    if (object.type === 'LineLoop' && count > 2) indices.push(vertex(count - 1), vertex(0));
  }
  //Shares the attributes, toNonIndexed creates the new ones
  const indexed = new BufferGeometry();
  for (const name in geometry.attributes) indexed.setAttribute(name, geometry.attributes[name]);
  indexed.morphAttributes = geometry.morphAttributes;
  indexed.morphTargetsRelative = geometry.morphTargetsRelative;
  indexed.setIndex(indices);
  const segments = indexed.toNonIndexed();
  //zinc builds its animation from the names of the morph targets
  for (const name in geometry.morphAttributes) {
    geometry.morphAttributes[name].forEach((attribute, i) => {
      if (segments.morphAttributes[name] && segments.morphAttributes[name][i]) {
        segments.morphAttributes[name][i].name = attribute.name;
      }
    });
  }
  segments.name = geometry.name;
  return segments;
};

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
 * mapped to regions and each mesh, lines and points mapped to a zinc object,
 * line strips and line loops are converted to line segments. Skinned meshes
 * are loaded in the pose of the file, skeletons and their animations are not
 * supported.
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
    if (isMesh(object)) {
      zincObject = new Geometry();
    } else if (isLines(object)) {
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
      zincObject.createLineSegment(toLineSegmentsGeometry(object), object.material, {
        localTimeEnabled,
        localMorphColour,
      });
    } else {
      //Children are loaded separately
      const mesh = object.isSkinnedMesh ? bakeSkinnedMesh(object) : object.clone(false);
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
      finishCallback(zincObject, { inlineObject: true });
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
      finishCallback(glyphset, { inlineObject: true });
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
    //Once for the file, not for each skinned mesh
    let skinnedMeshes = 0;
    object.traverse((child) => {
      if (child.isSkinnedMesh) skinnedMeshes++;
    });
    if (skinnedMeshes > 0) {
      console.warn(
        `GLTFToZincJSLoader: Skeletons are not supported, ${skinnedMeshes} skinned mesh(es) ` +
          'are loaded in the pose of the file without their skeleton and its animations.',
      );
    }
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

  /*
   * Viewport of a standard camera, it looks down its -z axis with +y up.
   * There is no target position, it is put on the view line next to the
   * centre of the scene.
   */
  const getViewportFromCamera = (scene, camera) => {
    const eye = new Vector3().setFromMatrixPosition(camera.matrixWorld);
    const direction = new Vector3(0, 0, -1).transformDirection(camera.matrixWorld);
    const up = new Vector3(0, 1, 0).transformDirection(camera.matrixWorld);
    let distance = 0;
    const box = scene.getBoundingBox();
    if (box) {
      const centre = box.getCenter(new Vector3());
      distance = centre.clone().sub(eye).dot(direction);
      if (!(distance > 0)) distance = box.min.distanceTo(box.max) / 2;
    }
    if (!(distance > 0)) distance = 1;
    const target = eye.clone().addScaledVector(direction, distance);
    return {
      nearPlane: camera.near,
      farPlane: camera.far,
      eyePosition: eye.toArray(),
      targetPosition: target.toArray(),
      upVector: up.toArray(),
    };
  };

  /**
   * Apply the views in a glTF loaded by GLTFLoader to scene - the views
   * exported by {@link SceneExporter} and the current viewport when it was
   * exported, or the first camera of files from other software.
   *
   * @param {Scene} scene - Scene to apply the views to.
   * @param {Object} gltf - Result of GLTFLoader.
   * @param {Object} options - Set options.viewAll to false to keep the
   * current viewport, the views are still added to the scene.
   * @return {Boolean} true if the glTF contains any view.
   */
  this.applyViews = (scene, gltf, options) => {
    gltf.scene.updateMatrixWorld(true);
    let views = undefined;
    let current = undefined;
    let camera = undefined;
    gltf.scene.traverse((object) => {
      const metadata = getZincMetadata(object);
      if (metadata && metadata.type === 'rootRegion' && metadata.views && metadata.views.Entries) {
        if (!views) views = metadata.views;
      } else if (metadata && metadata.type === 'view' && metadata.eyePosition) {
        if (!current) current = metadata;
      }
      if (object.isCamera && !camera) camera = object;
    });
    if (!current && camera) current = getViewportFromCamera(scene, camera);
    if (!views && !current) return false;
    const cameraControls = scene.getZincCameraControls();
    if (views) {
      scene.setupMultipleViews(views.Default, views.Entries);
    }
    if (current) {
      const viewport = cameraControls.getCurrentViewport();
      viewport.setFromObject(current);
      if (!views) {
        //Same as setCamera, reset view returns to it
        cameraControls.addViewport('default', viewport);
        cameraControls.setDefaultViewport('default');
      }
      if (!options || options.viewAll !== false) cameraControls.setCurrentCameraSettings(viewport);
    } else if (!options || options.viewAll !== false) {
      scene.resetView();
    }
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
   * with each zinc object in the file once it is loaded, or with
   * { type: 'Error', error } if the file can not be loaded. The second
   * argument is { inlineObject: true } - the call is for an object in the
   * file and not for the file itself, see allCompletedCallback.
   * @param {Function} allCompletedCallback - Called once everything is loaded
   * or the load has failed.
   * @param {Object} options - Optional settings for the views.
   * @param {Boolean} options.viewAll - Set to false to keep the current
   * viewport, the views in the file are still added to the scene.
   * @param {Boolean|Function} options.applyViews - Set to false, or a
   * function returning false once the file is loaded, to leave the views and
   * viewport of the scene untouched.
   * @param {Boolean} options.viewAllFallback - Set to false to not view all
   * when the file does not have any view.
   * @param {Function} options.onViewsApplied - Called when the views in the
   * file have been applied to the scene.
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
        finishCallback({ type: 'Error', error }, { inlineObject: true });
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
            let useViews = options ? options.applyViews : undefined;
            if (typeof useViews === 'function') useViews = useViews();
            if (useViews !== false) {
              if (_this.applyViews(scene, gltf, options)) {
                if (options && typeof options.onViewsApplied === 'function')
                  options.onViewsApplied();
              } else if (
                !options ||
                (options.viewAll !== false && options.viewAllFallback !== false)
              ) {
                _this.setCamera(scene);
              }
            }
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
