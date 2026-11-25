import * as THREE from 'three/webgpu';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { copyMatrixForExport, EXPORT_ANIMATION_FPS, useStandardIndexType } from './utilities';

/*
 * GLTFExporter only writes POSITION and NORMAL morph targets. glTF allows
 * COLOR_n morph targets as well (GLTFLoader reads them), so add them to the
 * targets the exporter has already written. Like other glTF morph targets
 * they are stored relative to the base attribute.
 */
class GLTFMorphColourPlugin {
  constructor(writer) {
    this.writer = writer;
    this.name = 'ZINC_morph_colour';
  }

  writeMesh(mesh, meshDef) {
    const geometry = mesh.geometry;
    const morphColours =
      geometry && geometry.morphAttributes ? geometry.morphAttributes.color : undefined;
    const baseColour = geometry ? geometry.attributes.color : undefined;
    const primitive = meshDef.primitives ? meshDef.primitives[0] : undefined;
    if (!morphColours || !baseColour || !primitive || !primitive.targets) return;
    // All primitives of a mesh share the same targets array.
    const targets = primitive.targets;
    const itemSize = baseColour.itemSize;
    const count = baseColour.count;
    for (let i = 0; i < targets.length && i < morphColours.length; i++) {
      const attribute = morphColours[i];
      if (attribute.itemSize !== itemSize || attribute.count < count) {
        console.warn('GLTFExporter: Colour morph target does not match the base colour, skipped.');
        return;
      }
      const array = new Float32Array(count * itemSize);
      for (let j = 0; j < count; j++) {
        for (let a = 0; a < itemSize; a++) {
          const value = attribute.getComponent(j, a);
          array[j * itemSize + a] = geometry.morphTargetsRelative
            ? value
            : value - baseColour.getComponent(j, a);
        }
      }
      targets[i].COLOR_0 = this.writer.processAccessor(
        new THREE.BufferAttribute(array, itemSize),
        geometry,
      );
    }
  }
}

/*
 * Write the glyphset data of glyphsets into extras.zinc.glyphset of their
 * nodes, in the same format read by Glyphset.load. Each frame of the
 * positions, axes, scale and colours is stored in an accessor, the frame
 * objects hold the accessor indices instead of the values. Colours are
 * stored as RGB.
 */
class GLTFGlyphsetPlugin {
  constructor(writer, glyphsetNodes) {
    this.writer = writer;
    this.name = 'ZINC_glyphset';
    this.glyphsetNodes = glyphsetNodes;
  }

  writeFrames(frames, toArray) {
    if (!frames) return undefined;
    const accessors = {};
    for (const key in frames) {
      if (frames[key]) {
        const array = toArray(frames[key]);
        const index = this.writer.processAccessor(new THREE.BufferAttribute(array, 3));
        if (index !== null) accessors[key] = index;
      }
    }
    return accessors;
  }

  writeNode(object, nodeDef) {
    const entry = this.glyphsetNodes.get(object);
    if (!entry || !nodeDef.extras || !nodeDef.extras.zinc) return;
    const { data, displayLabels, globalScale } = entry;
    const vectors = (frame) => Float32Array.from(frame);
    const colours = (frame) => {
      const array = new Float32Array(frame.length * 3);
      for (let i = 0; i < frame.length; i++) {
        array[i * 3] = ((frame[i] >> 16) & 255) / 255;
        array[i * 3 + 1] = ((frame[i] >> 8) & 255) / 255;
        array[i * 3 + 2] = (frame[i] & 255) / 255;
      }
      return array;
    };
    const glyphset = {
      metadata: data.metadata,
      displayLabels,
      globalScale,
      positions: this.writeFrames(data.positions, vectors),
      axis1: this.writeFrames(data.axis1, vectors),
      axis2: this.writeFrames(data.axis2, vectors),
      axis3: this.writeFrames(data.axis3, vectors),
      scale: this.writeFrames(data.scale, vectors),
      colors: this.writeFrames(data.colors, colours),
    };
    if (data.label) glyphset.label = data.label;
    //Drops the undefined values
    nodeDef.extras.zinc.glyphset = JSON.parse(JSON.stringify(glyphset));
  }
}

//WebGL constant for float accessors
const FLOAT = 5126;

const getZincType = (zincObject) => {
  if (zincObject.isGlyphset) return 'glyphset';
  if (zincObject.isPointset) return 'pointset';
  if (zincObject.isTubeLines) return 'tubeLines';
  if (zincObject.isLines) return 'lines';
  if (zincObject.isGeometry) return 'geometry';
  return 'zincObject';
};

/*
 * Animation channel of the morph targets of an export object, it plays the
 * morph targets in sequence with linear blending like zinc does (see
 * ZincObject.setMesh). Each target is fully weighted at its own time step
 * only.
 */
const createMorphChannels = (object) => {
  if (!object.geometry || !object.morphTargetInfluences) return [];
  const morphAttributes = object.geometry.morphAttributes;
  //GLTFExporter writes the position and normal targets
  const targets = morphAttributes.position || morphAttributes.normal;
  if (!targets || targets.length < 2) return [];
  const count = targets.length;
  const times = new Float32Array(count);
  const values = new Float32Array(count * count);
  for (let frame = 0; frame < count; frame++) {
    times[frame] = frame / EXPORT_ANIMATION_FPS;
    values[frame * count + frame] = 1;
  }
  return [{ object, path: 'weights', times, values, itemSize: 1 }];
};

const ACCESSOR_TYPES = { 1: 'SCALAR', 3: 'VEC3', 4: 'VEC4' };

/*
 * Write the animation channels of the export objects as a single animation,
 * so other software plays all of them together. Each channel is
 * { object, path, times, values, itemSize } with path being 'translation',
 * 'rotation', 'scale' or 'weights'.
 *
 * The animation is written here rather than with the animations option of
 * GLTFExporter, it searches the whole scene for the node of every track which
 * is slow for scenes with many objects, writes every track into its own
 * buffer view and writes every node with translation, rotation and scale,
 * losing any shear of the transformations. Here the times are shared, the
 * values of the channels are packed into one buffer view for each accessor
 * type and only the animated nodes are written with translation, rotation
 * and scale.
 */
class GLTFAnimationPlugin {
  constructor(writer, channels) {
    this.writer = writer;
    this.name = 'ZINC_animation';
    this.channels = channels;
    this.animatedObjects = new Set();
    channels.forEach((channel) => this.animatedObjects.add(channel.object));
  }

  //glTF only allows translation, rotation and scale on animated nodes
  writeNode(object, nodeDef) {
    if (!nodeDef.matrix || !this.animatedObjects.has(object)) return;
    delete nodeDef.matrix;
    const translation = object.position.toArray();
    const rotation = object.quaternion.toArray();
    const scale = object.scale.toArray();
    if (translation.some((value) => value !== 0)) nodeDef.translation = translation;
    if (rotation[0] !== 0 || rotation[1] !== 0 || rotation[2] !== 0 || rotation[3] !== 1) {
      nodeDef.rotation = rotation;
    }
    if (scale.some((value) => value !== 1)) nodeDef.scale = scale;
  }

  afterParse() {
    const writer = this.writer;
    const json = writer.json;
    //Objects left out of the export, e.g. hidden, have no node
    const channels = [];
    this.channels.forEach((channel) => {
      const node = writer.nodeMap.get(channel.object);
      if (node !== undefined) channels.push({ channel, node });
    });
    if (channels.length === 0) return;
    if (!json.accessors) json.accessors = [];

    //The same times are written once
    const inputsByArray = new Map();
    const inputsByValue = new Map();
    const getInput = (times) => {
      if (!inputsByArray.has(times)) {
        const key = Array.from(times).join(',');
        if (!inputsByValue.has(key)) {
          inputsByValue.set(key, writer.processAccessor(new THREE.BufferAttribute(times, 1)));
        }
        inputsByArray.set(times, inputsByValue.get(key));
      }
      return inputsByArray.get(times);
    };

    //Pack the values of the channels with the same item size together
    const packs = new Map();
    channels.forEach((entry) => {
      const { itemSize, values } = entry.channel;
      if (!packs.has(itemSize)) packs.set(itemSize, { length: 0 });
      const pack = packs.get(itemSize);
      entry.offset = pack.length;
      pack.length += values.length;
    });
    packs.forEach((pack, itemSize) => {
      pack.array = new Float32Array(pack.length);
      channels.forEach((entry) => {
        if (entry.channel.itemSize === itemSize) pack.array.set(entry.channel.values, entry.offset);
      });
      pack.bufferView = writer.processBufferView(
        new THREE.BufferAttribute(pack.array, itemSize),
        FLOAT,
        0,
        pack.length / itemSize,
      ).id;
    });

    const animation = { name: 'zinc', samplers: [], channels: [] };
    channels.forEach(({ channel, node, offset }) => {
      const output = json.accessors.length;
      json.accessors.push({
        bufferView: packs.get(channel.itemSize).bufferView,
        byteOffset: offset * 4,
        componentType: FLOAT,
        count: channel.values.length / channel.itemSize,
        type: ACCESSOR_TYPES[channel.itemSize],
      });
      animation.channels.push({
        sampler: animation.samplers.length,
        target: { node, path: channel.path },
      });
      animation.samplers.push({ input: getInput(channel.times), output, interpolation: 'LINEAR' });
    });
    if (!json.animations) json.animations = [];
    json.animations.push(animation);
  }
}

/**
 * Provides an object which uses for exporting the scene
 *
 * The exported glTF mirrors zinc's own structure - every region is a node
 * containing a node for each of its zinc objects and child regions. Zinc
 * specific information is stored in the "extras.zinc" of these nodes, which
 * is read by {@link GLTFToZincJSLoader} and safely ignored by other software:
 *
 * - region: { type: 'rootRegion' | 'region', name, duration }, the root
 *   region also has views when views have been provided to the scene, e.g.
 *   from the metadata, see {@link Scene#getViews}.
 * - view: { type: 'view', nearPlane, farPlane, eyePosition, targetPosition,
 *   upVector } on the node of a standard camera, the current viewport when
 *   exported.
 * - zinc object: { type: 'geometry' | 'lines' | 'pointset' | 'glyphset' | ...,
 *   groupName, anatomicalId, duration, timeEnabled, morphColour }
 * - glyphset: also { glyphset: { metadata, label, displayLabels, globalScale,
 *   positions, axis1, axis2, axis3, scale, colors } }, the same format read
 *   by Glyphset.load except each frame is an accessor index and colours are
 *   RGB. The glyphs are exported as an instanced mesh showing their current
 *   state, other software does not play their animation.
 *
 * Markers, labels and other objects only used for rendering in zinc are not
 * exported.
 *
 * @class
 * @author Alan Wu
 * @return {SceneExporter}
 */
const SceneExporter = function (sceneIn) {
  const scene = sceneIn;

  const createZincObjectNode = (zincObject, channels, glyphsetNodes) => {
    if (!zincObject.getGroup().visible || !zincObject.createExportObject) return undefined;
    const object = zincObject.createExportObject();
    if (!object) return undefined;
    const data =
      zincObject.isGlyphset && zincObject.getGlyphsetData
        ? zincObject.getGlyphsetData()
        : undefined;
    let timeEnabled = zincObject.timeEnabled;
    let morphColour = zincObject.morphColour;
    if (data) {
      //Glyphsets keep track of their animation in their metadata
      timeEnabled = !!(data.metadata.MorphVertices && data.metadata.number_of_time_steps > 1);
      morphColour = !!data.metadata.MorphColours;
    }
    const node = new THREE.Group();
    node.name = zincObject.groupName ? zincObject.groupName : '';
    //JSON drops the undefined values
    node.userData = {
      zinc: {
        type: getZincType(zincObject),
        groupName: zincObject.groupName,
        anatomicalId: zincObject.anatomicalId,
        duration: zincObject.duration,
        timeEnabled,
        morphColour,
      },
    };
    copyMatrixForExport(zincObject.getGroup(), node);
    node.add(object);
    createMorphChannels(object).forEach((channel) => channels.push(channel));
    if (zincObject.isGlyphset && zincObject.getGlyphsetData) {
      //The glyphset data is written by GLTFGlyphsetPlugin for zinc to
      //recreate the glyphset, the instanced mesh provides the glyph.
      if (data) {
        glyphsetNodes.set(node, {
          data,
          displayLabels: !!zincObject.isLabelDisplayed(),
          globalScale: zincObject.globalScale,
        });
      }
    }
    return node;
  };

  const createRegionNode = (region, isRoot, channels, glyphsetNodes) => {
    const group = region.getGroup();
    if (!isRoot && !group.visible) return undefined;
    const node = new THREE.Group();
    node.name = region.getName();
    node.userData = {
      zinc: {
        type: isRoot ? 'rootRegion' : 'region',
        name: region.getName(),
        duration: region.getDuration(),
      },
    };
    //Views provided to the scene, e.g. from the metadata
    if (isRoot && scene.getViews && scene.getViews()) {
      node.userData.zinc.views = scene.getViews();
    }
    copyMatrixForExport(group, node);
    region.getAllObjects(false).forEach((zincObject) => {
      const childNode = createZincObjectNode(zincObject, channels, glyphsetNodes);
      if (childNode) node.add(childNode);
    });
    region.getChildRegions(false).forEach((childRegion) => {
      const childNode = createRegionNode(childRegion, false, channels, glyphsetNodes);
      if (childNode) node.add(childNode);
    });
    return node;
  };

  /*
   * The current viewport as a standard camera, its extras.zinc keeps the
   * viewport as a glTF camera has no target position.
   */
  const createViewCamera = () => {
    const cameraControls = scene.getZincCameraControls ? scene.getZincCameraControls() : undefined;
    if (!cameraControls || !scene.camera) return undefined;
    const viewport = cameraControls.getCurrentViewport();
    const near = viewport.nearPlane > 0 ? viewport.nearPlane : 1e-6;
    const far = viewport.farPlane > near ? viewport.farPlane : near * 2;
    const aspect = scene.camera.aspect > 0 ? scene.camera.aspect : 1;
    const camera = new THREE.PerspectiveCamera(scene.camera.fov, aspect, near, far);
    camera.name = 'zinc_view';
    camera.position.fromArray(viewport.eyePosition);
    camera.up.fromArray(viewport.upVector);
    camera.lookAt(new THREE.Vector3().fromArray(viewport.targetPosition));
    camera.updateMatrix();
    camera.userData = {
      zinc: {
        type: 'view',
        nearPlane: viewport.nearPlane,
        farPlane: viewport.farPlane,
        eyePosition: viewport.eyePosition,
        targetPosition: viewport.targetPosition,
        upVector: viewport.upVector,
      },
    };
    return camera;
  };

  /**
   * Export the scene as glTF.
   *
   * @param {Boolean} binary - Export as GLB if true.
   * @return {Promise} Resolves to the glTF json object or the GLB ArrayBuffer.
   */
  this.exportGLTF = async (binary) => {
    const rootRegion = scene.getRootRegion();
    const glyphsetsToRestore = [];
    try {
      for (const zincObject of rootRegion.getAllObjects(true)) {
        // Glyphsets with GPU-compute-driven colour intentionally keep
        // instanceColor null during normal rendering (see glyphset.js's
        // prepareColorForExport() for why) - populate it just for this
        // export, then undo it again afterwards.
        if (zincObject.isGlyphset && zincObject.prepareColorForExport) {
          await zincObject.prepareColorForExport();
          glyphsetsToRestore.push(zincObject);
        }
      }
      //Build a separate tree for export, the scene itself is not modified.
      const channels = [];
      const glyphsetNodes = new Map();
      const root = createRegionNode(rootRegion, true, channels, glyphsetNodes);
      //GLTFExporter only accepts plain typed arrays
      const restoreIndexType = useStandardIndexType(root);
      const exporter = new GLTFExporter();
      exporter.register((writer) => new GLTFMorphColourPlugin(writer));
      exporter.register((writer) => new GLTFGlyphsetPlugin(writer, glyphsetNodes));
      exporter.register((writer) => new GLTFAnimationPlugin(writer, channels));
      const options = { binary, onlyVisible: true };
      //The camera is in world coordinates, next to the root region
      const camera = createViewCamera();
      try {
        return await exporter.parseAsync(camera ? [root, camera] : root, options);
      } catch (error) {
        console.error('Unable to export GLTF.', error);
        throw error;
      } finally {
        restoreIndexType();
      }
    } finally {
      glyphsetsToRestore.forEach((zincObject) => zincObject.clearColorExportState());
    }
  };
};

export { SceneExporter };
