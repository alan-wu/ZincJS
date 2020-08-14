const THREE = require('three');

exports.Minimap = function(sceneIn) {
  let targetScene = sceneIn;
  this.camera = new THREE.OrthographicCamera(
    -0.5, 0.5 , 0.5, -0.5, 0.01, 10);
  this.helper = undefined;

  this.setCurrentCameraSettings = (diameter, newViewport) => {
		this.camera.near = 0;
		if (newViewport.farPlane)
			this.camera.far = newViewport.farPlane;
		if (newViewport.eyePosition)
			this.camera.position.set( newViewport.eyePosition[0], 
          newViewport.eyePosition[1], newViewport.eyePosition[2]);
    if (newViewport.upVector)
      this.camera.up.set( newViewport.upVector[0], newViewport.upVector[1],
        newViewport.upVector[2]);
		if (newViewport.targetPosition) {
			this.camera.lookAt( new THREE.Vector3(newViewport.targetPosition[0],
          newViewport.targetPosition[1], newViewport.targetPosition[2]  ));
    }
    this.camera.zoom = 1 / diameter ;
		this.camera.updateProjectionMatrix();
	}

  this.updateCamera = () => {
    if (!this.helper) {
      this.helper = new THREE.CameraHelper(targetScene.camera);
    }
    this.helper.update();
    let cameraControl = targetScene.getZincCameraControls();
    let boundingBox = targetScene.getBoundingBox();
    if (boundingBox) {
      // enlarge radius to keep image within edge of window
      const diameter = boundingBox.min.distanceTo(boundingBox.max);
      const radius = diameter / 2.0;
      const centreX = (boundingBox.min.x + boundingBox.max.x) / 2.0;
      const centreY = (boundingBox.min.y + boundingBox.max.y) / 2.0;
      const centreZ = (boundingBox.min.z + boundingBox.max.z) / 2.0;
      const clip_factor = 4.0;
      const viewport = cameraControl.getViewportFromCentreAndRadius(
        centreX, centreY, centreZ, radius, 40, radius * clip_factor);
      this.setCurrentCameraSettings(diameter, viewport);
    }
  }
}
