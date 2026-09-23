import { BufferAttribute } from 'three/webgpu';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';

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
    const morphColours = geometry && geometry.morphAttributes ?
      geometry.morphAttributes.color : undefined;
    const baseColour = geometry ? geometry.attributes.color : undefined;
    const primitive = meshDef.primitives ? meshDef.primitives[0] : undefined;
    if (!morphColours || !baseColour || !primitive || !primitive.targets)
      return;
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
          array[j * itemSize + a] = geometry.morphTargetsRelative ?
            value : value - baseColour.getComponent(j, a);
        }
      }
      targets[i].COLOR_0 = this.writer.processAccessor(
        new BufferAttribute(array, itemSize), geometry);
    }
  }
}

/**
 * Provides an object which uses for exporting the scene
 *
 * @class
 * @author Alan Wu
 * @return {SceneExporter}
 */
const SceneExporter = function (sceneIn) {
  const scene = sceneIn;

  // Matches the exporter's onlyVisible pruning - animations targeting a
  // hidden node would otherwise produce channels with no target node.
  const isVisible = (object) => {
    for (let current = object; current; current = current.parent) {
      if (current.visible === false) return false;
    }
    return true;
  };

	this.exportGLTF = async (binary) => {
    const rootRegion = scene.getRootRegion();
    const zincObjects = rootRegion.getAllObjects(true);
    const animations = [];
    const glyphsetsToRestore = [];
    for (const zincObject of zincObjects) {
      if (zincObject.animationClip && zincObject.animationClip[0]) {
        const mesh = zincObject.getMorph();
        if (mesh && isVisible(mesh)) {
          // The exporter resolves tracks against the scene root, but morph
          // clips target '' (the mesh itself), so retarget them by uuid.
          const clip = zincObject.animationClip[0].clone();
          clip.tracks.forEach(track => { track.name = mesh.uuid + track.name; });
          animations.push(clip);
        }
      }
      // Glyphsets with GPU-compute-driven colour intentionally keep
      // instanceColor null during normal rendering (see glyphset.js's
      // prepareColorForExport() for why) - populate it just for this
      // export, then undo it again afterwards.
      if (zincObject.isGlyphset && zincObject.prepareColorForExport) {
        await zincObject.prepareColorForExport();
        glyphsetsToRestore.push(zincObject);
      }
    }
    const exporter = new GLTFExporter();
    exporter.register(writer => new GLTFMorphColourPlugin(writer));
    const options = { binary, animations, onlyVisible: true };
    try {
      return await new Promise((resolve, reject) => {
        exporter.parse(
          scene.getThreeJSScene(),
          function ( gltf ) {
            resolve(gltf);
          },
          function ( error ) {
            console.error("Unable to export GLTF.", error);
            reject(error);
          },
          options );
      });
    } finally {
      glyphsetsToRestore.forEach(zincObject => zincObject.clearColorExportState());
    }
	}
}

export { SceneExporter };
