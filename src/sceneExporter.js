const GLTFExporter = require('./three/GLTFExporter').GLTFExporter;

/**
 * Provides an object which uses for exporting the scene
 * 
 * @class
 * @author Alan Wu
 * @return {Zinc.Lines}
 */
const SceneExporter = function (sceneIn) {
  const scene = sceneIn;

	this.exportGLTF = (binary) => {
    const exporter = new GLTFExporter();
    const options = { binary };
    return new Promise((resolve, reject) => {
      exporter.parse( scene.getThreeJSScene(), function ( gltf ) {
        resolve(gltf);
      }, options );
    });
	}
}

exports.SceneExporter = SceneExporter;
