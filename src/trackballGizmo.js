import * as THREE from 'three/webgpu';

const SEGMENTS = 128;
//Radius of the pivot dot in pixels
const DOT_PIXELS = 4;

const createCircleGeometry = () => {
  const positions = new Float32Array((SEGMENTS + 1) * 3);
  for (let i = 0; i <= SEGMENTS; i++) {
    const theta = (i / SEGMENTS) * Math.PI * 2;
    positions[i * 3] = Math.cos(theta);
    positions[i * 3 + 1] = Math.sin(theta);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geometry;
};

const overlayMaterialSettings = {
  depthTest: false,
  depthWrite: false,
  transparent: true,
};

/**
 * Graphics shown while the camera is rotated about a picked pivot. It draws
 * a dot at the pivot, a screen aligned ring at the trackball radius marking
 * where dragging turns into roll, and three great circles fixed to the
 * world axes which turn with the model as the camera rotates.
 *
 * It lives in its own scene and is drawn after the main scene with a camera
 * whose clipping planes enclose the gizmo, so it is never clipped or hidden
 * by the model.
 *
 * @private
 */
const TrackballGizmo = function () {
  const scene = new THREE.Scene();
  const group = new THREE.Group();
  const billboard = new THREE.Group();
  const overlayCamera = new THREE.PerspectiveCamera();
  const circle = createCircleGeometry();
  const materials = [];
  const _forward = new THREE.Vector3();
  let worldRadius = 0;
  let pivotDepth = 0;
  this.visible = false;

  const createLoop = (color, opacity) => {
    const material = new THREE.LineBasicMaterial({ color, opacity, ...overlayMaterialSettings });
    materials.push(material);
    return new THREE.Line(circle, material);
  };

  //Great circles in the YZ, XZ and XY planes, coloured as the X, Y and Z axes
  const ringX = createLoop(0xd62728, 0.8);
  ringX.rotation.y = Math.PI / 2;
  const ringY = createLoop(0x2ca02c, 0.8);
  ringY.rotation.x = Math.PI / 2;
  const ringZ = createLoop(0x1f77b4, 0.8);
  group.add(ringX, ringY, ringZ);

  const outerRing = createLoop(0x555555, 0.9);
  billboard.add(outerRing);
  const dotMaterial = new THREE.MeshBasicMaterial({
    color: 0xff7f0e,
    side: THREE.DoubleSide,
    ...overlayMaterialSettings,
  });
  materials.push(dotMaterial);
  const dotGeometry = new THREE.CircleGeometry(1, 24);
  const dot = new THREE.Mesh(dotGeometry, dotMaterial);
  //Draw the dot over the rings
  dot.renderOrder = 1;
  billboard.add(dot);
  group.add(billboard);
  scene.add(group);

  /**
   * Place the gizmo at the pivot with the trackball radius given in pixels.
   *
   * @param {THREE.PerspectiveCamera} camera - Camera viewing the scene.
   * @param {THREE.Vector3} pivot - Centre of the rotation.
   * @param {Number} radiusPixels - Trackball radius in pixels.
   * @param {Number} viewportHeight - Height of the viewport in pixels.
   */
  this.update = (camera, pivot, radiusPixels, viewportHeight) => {
    camera.getWorldDirection(_forward);
    pivotDepth = _forward.dot(group.position.copy(pivot).sub(camera.position));
    group.position.copy(pivot);
    if (!(pivotDepth > 0) || !(viewportHeight > 0)) {
      worldRadius = 0;
      return;
    }
    const worldPerPixel =
      (2 * pivotDepth * Math.tan(THREE.MathUtils.DEG2RAD * camera.fov * 0.5)) /
      (camera.zoom * viewportHeight);
    worldRadius = radiusPixels * worldPerPixel;
    group.scale.setScalar(worldRadius);
    dot.scale.setScalar(DOT_PIXELS / radiusPixels);
    //Parallel to the screen so the ring is an exact circle of the trackball
    //radius around the pivot, the group itself is never rotated.
    camera.getWorldQuaternion(billboard.quaternion);
    group.updateMatrixWorld(true);
  };

  /**
   * Draw the gizmo on top of what has already been rendered.
   *
   * @param {THREE.WebGPURenderer} renderer
   * @param {THREE.PerspectiveCamera} camera - Camera viewing the scene.
   */
  this.render = (renderer, camera) => {
    if (!this.visible || !(worldRadius > 0)) return;
    overlayCamera.copy(camera);
    //Enclose the gizmo sphere, the ring facing the camera is slightly
    //further out than the sphere radius.
    const extent = worldRadius * 1.1;
    overlayCamera.near = Math.max(pivotDepth - extent, pivotDepth * 1e-3);
    overlayCamera.far = pivotDepth + extent;
    overlayCamera.updateProjectionMatrix();
    renderer.render(scene, overlayCamera);
  };

  this.dispose = () => {
    circle.dispose();
    dotGeometry.dispose();
    materials.forEach((material) => material.dispose());
  };
};

export { TrackballGizmo };
