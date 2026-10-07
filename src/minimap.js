import * as THREE from 'three/webgpu';
import { copyVector3sArray } from "./utilities";

/**
 * This provide a full scale minimap. It will always
 * display the whole map.
 *
 * @class
 * @author Alan Wu
 * @return {Minimap}
 */
const Minimap = function (sceneIn) {
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
  const _coord = new THREE.Vector3();
  const _lookAt = new THREE.Vector3();
  const _target = new THREE.Vector3();
  const _corners = [new THREE.Vector3(), new THREE.Vector3(),
    new THREE.Vector3(), new THREE.Vector3()];
  const _boundaryVertices = [_corners[0], _corners[1], _corners[2],
    _corners[2], _corners[3], _corners[0]];
  //State the minimap was last computed from, it only needs to be updated
  //when the scene or the main camera changes.
  const _lastBoundingBox = new THREE.Box3();
  const _lastMatrixWorld = new THREE.Matrix4();
  const _lastProjectionMatrix = new THREE.Matrix4();
  let _lastNear = undefined;
  let _cameraUpdated = false;
  //Matrix4.equals treats NaN as different, e.g. with a zero sized canvas
  const matrixEquals = (a, b) => {
    for (let i = 0; i < 16; i++) {
      if (!Object.is(a.elements[i], b.elements[i]))
        return false;
    }
    return true;
  }

  this.getDiffFromNormalised = (x, y) => {
    _box.setFromBufferAttribute(positionAttributes).getCenter(_center);
    _coord.copy(_center).project(this.camera);
    //Returns a new vector, the caller may keep it
    return new THREE.Vector3(x, y, _coord.z).unproject(this.camera).sub(_center);
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
      this.camera.lookAt(_lookAt.set(newViewport.targetPosition[0],
        newViewport.targetPosition[1], newViewport.targetPosition[2]));
    this.camera.zoom = 1 / diameter;
    this.camera.updateProjectionMatrix();
  }

  this.getBoundary = () => {
    const camera = targetScene.camera;
    _target.copy(camera.target).project(camera);
    _corners[0].set(-1, -1, _target.z).unproject(camera);
    _corners[1].set(1, -1, _target.z).unproject(camera);
    _corners[2].set(1, 1, _target.z).unproject(camera);
    _corners[3].set(-1, 1, _target.z).unproject(camera);
    copyVector3sArray(positionAttributes, _boundaryVertices);
  }

  this.updateCamera = () => {
    const camera = targetScene.camera;
    let boundingBox = targetScene.getBoundingBox();
    //Nothing has changed since the last update
    if (_cameraUpdated && boundingBox && boundingBox.equals(_lastBoundingBox) &&
      _lastNear === camera.near &&
      matrixEquals(_lastMatrixWorld, camera.matrixWorld) &&
      matrixEquals(_lastProjectionMatrix, camera.projectionMatrix)) {
      return;
    }
    this.getBoundary();
    _lastMatrixWorld.copy(camera.matrixWorld);
    _lastProjectionMatrix.copy(camera.projectionMatrix);
    _lastNear = camera.near;
    _cameraUpdated = false;
    let cameraControl = targetScene.getZincCameraControls();
    if (boundingBox) {
      _lastBoundingBox.copy(boundingBox);
      _cameraUpdated = true;
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

export { Minimap };