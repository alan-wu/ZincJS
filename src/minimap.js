const THREE = require('three');

/**
 * This provide a full scale minimap. It will always
 * display the whole map.
 * 
 * @class
 * @author Alan Wu
 * @return {Minimap}
 */
exports.Minimap = function (sceneIn) {
  let targetScene = sceneIn;
  this.camera = new THREE.OrthographicCamera(
    -0.5, 0.5, 0.5, -0.5, 0.01, 10);
  this.helper = undefined;
  let geometry = new THREE.BufferGeometry();
  var vertices = new Float32Array( [
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0, -1.0,  1.0
  ] );
  let positionAttributes = new THREE.BufferAttribute( vertices, 3 );
  geometry.setAttribute( 'position', positionAttributes);
  var material = new THREE.MeshBasicMaterial( { color: 0x333333, 
    depthTest: false,
    depthWrite: false,
    opacity: 0.5,
    transparent: true } );
  this.mask = new THREE.Mesh( geometry, material );
  let _box = new THREE.Box3();
  let _center = new THREE.Vector3();

  this.getDiffFromNormalised = (x, y) => {
    _box.setFromBufferAttribute(positionAttributes).getCenter(_center);
    let coord = _center.clone().project(this.camera);
    let new_coord = new THREE.Vector3(x, y, coord.z).unproject(this.camera);
    return new_coord.sub(_center);
  }

  let setCurrentCameraSettings = (diameter, newViewport)  => {
    if (targetScene.camera.near)
      this.camera.near = targetScene.camera.near;
    if (newViewport.farPlane)
      this.camera.far = newViewport.farPlane;
    if (newViewport.eyePosition)
      this.camera.position.set(newViewport.eyePosition[0],
        newViewport.eyePosition[1], newViewport.eyePosition[2]);
    if (newViewport.upVector)
      this.camera.up.set(newViewport.upVector[0], newViewport.upVector[1],
        newViewport.upVector[2]);
    if (newViewport.targetPosition)
      this.camera.lookAt(new THREE.Vector3(newViewport.targetPosition[0],
        newViewport.targetPosition[1], newViewport.targetPosition[2]));
    this.camera.zoom = 1 / diameter;
    this.camera.updateProjectionMatrix();
  }

  this.getBoundary = () => {
    let target = new THREE.Vector3().copy(
      targetScene.camera.target).project(targetScene.camera);
    let v1 = new THREE.Vector3(-1, -1, target.z).unproject(targetScene.camera);
    let v2 = new THREE.Vector3(1, -1, target.z).unproject(targetScene.camera);
    let v3 = new THREE.Vector3(1, 1, target.z).unproject(targetScene.camera);
    let v4 = new THREE.Vector3(-1, 1, target.z).unproject(targetScene.camera);
    let array = [v1, v2, v3, v3, v4, v1];
    positionAttributes.copyVector3sArray(array);
    positionAttributes.needsUpdate = true;
  }

  this.updateCamera = () => {
    this.getBoundary();
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
      setCurrentCameraSettings(diameter, viewport);
    }
  }
}
