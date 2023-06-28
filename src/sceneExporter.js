const GLTFExporter = require('./three/GLTFExporter').GLTFExporter;

/**
 * Provides an object which uses for exporting the scene
 * 
 * @class
 * @author Alan Wu
 * @return {SceneExporter}
 */
const SceneExporter = function (sceneIn) {
  const scene = sceneIn;

	this.exportGLTF = (binary) => {
    const rootRegion = scene.getRootRegion();
    const zincObjects = rootRegion.getAllObjects(true);
    const animations = [];
    zincObjects.forEach(zincObject => {
      if (zincObject.animationClip) {
        animations.push({clip: zincObject.animationClip[0], mesh: zincObject.morph});
      }
    });
    const exporter = new GLTFExporter();
    const options = { binary, animations };
    return new Promise((resolve, reject) => {
      exporter.parse( scene.getThreeJSScene(), function ( gltf ) {
        resolve(gltf);
      }, options );
    });
	}
}

exports.SceneExporter = SceneExporter;
