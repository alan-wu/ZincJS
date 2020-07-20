const THREE = require('three');

exports.Minimap = function(scene) {
  this.camera = new THREE.OrthographicCamera(-0.5, 0.5 , 0.5, -0.5, 0.01, 10);
  //scene.camera.add( this.camera );
}
