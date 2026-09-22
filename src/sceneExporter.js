import { GLTFExporter } from './three/GLTFExporter';

/**
 * Provides an object which uses for exporting the scene
 *
 * @class
 * @author Alan Wu
 * @return {SceneExporter}
 */
const SceneExporter = function (sceneIn) {
  const scene = sceneIn;

	this.exportGLTF = async (binary) => {
    const rootRegion = scene.getRootRegion();
    const zincObjects = rootRegion.getAllObjects(true);
    const animations = [];
    const glyphsetsToRestore = [];
    for (const zincObject of zincObjects) {
      if (zincObject.animationClip) {
        animations.push({clip: zincObject.animationClip[0], mesh: zincObject.getMorph()});
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
    const options = { binary, animations };
    try {
      return await new Promise((resolve, reject) => {
        exporter.parse( scene.getThreeJSScene(), function ( gltf ) {
          resolve(gltf);
        }, options );
      });
    } finally {
      glyphsetsToRestore.forEach(zincObject => zincObject.clearColorExportState());
    }
	}
}

export { SceneExporter };
