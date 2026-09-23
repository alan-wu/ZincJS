import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
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
