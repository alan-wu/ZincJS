import * as THREE from 'three/webgpu';
import { it, expect } from 'vitest';
import { CameraControls } from '../src/controls';

// A long and narrow model, similar in proportion to a vagus nerve.
const longBox = new THREE.Box3(new THREE.Vector3(-500, -1, -1), new THREE.Vector3(500, 1, 1));
const corners = [
  [-500, -1, -1],
  [-500, 1, 1],
  [500, -1, -1],
  [500, 1, 1],
].map((c) => new THREE.Vector3(...c));

const setup = () => {
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
  const scene = { getBoundingBox: () => longBox };
  const domElement = document.createElement('div');
  const controls = new CameraControls(camera, domElement, undefined, scene);
  controls.calculateMaxAllowedDistance(scene);
  return { camera, controls };
};

// Depth of a point along the camera view direction.
const depthOf = (camera, point) => {
  const dir = camera.target.clone().sub(camera.position).normalize();
  return point.clone().sub(camera.position).dot(dir);
};

const expectAllCornersInside = (camera) => {
  for (const corner of corners) {
    const depth = depthOf(camera, corner);
    if (depth > 0) expect(depth).toBeLessThanOrEqual(camera.far);
  }
};

const expectProjectionMatches = (camera) => {
  const reference = camera.clone();
  reference.updateProjectionMatrix();
  expect(camera.projectionMatrix.elements).toEqual(reference.projectionMatrix.elements);
};

it('keeps the whole long model inside the frustum when zoomed in on one end', () => {
  const { camera, controls } = setup();
  // Close to one end, looking along the model.
  controls.setCurrentCameraSettings({
    eyePosition: [-505, 0, 0],
    targetPosition: [-500, 0, 0],
    upVector: [0, 1, 0],
  });
  controls.update(0);
  expectAllCornersInside(camera);
  expect(camera.near).toBeGreaterThan(0);
  expect(camera.near).toBeLessThan(5);
  expectProjectionMatches(camera);
});

it('recalculates the planes after rotating', () => {
  const { camera, controls } = setup();
  // Looking across the model, close to its surface.
  controls.setCurrentCameraSettings({
    eyePosition: [-490, 0, 5],
    targetPosition: [-490, 0, 0],
    upVector: [0, 1, 0],
  });
  controls.update(0);
  const farAcross = camera.far;
  // Rotate so the view runs along the model.
  controls.rotateAboutLookAtpoint(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
  expect(camera.target.x - camera.position.x).toBeGreaterThan(4);
  controls.update(0);
  expect(camera.far).toBeGreaterThan(farAcross);
  expectAllCornersInside(camera);
  expectProjectionMatches(camera);
});

it('keeps near plane positive and in front of the target when inside the model bounds', () => {
  const { camera, controls } = setup();
  controls.setCurrentCameraSettings({
    eyePosition: [0, 0, 0.5],
    targetPosition: [0, 0, 0],
    upVector: [0, 1, 0],
  });
  controls.update(0);
  expect(camera.near).toBeGreaterThan(0);
  expect(camera.near).toBeLessThan(0.5);
  expect(camera.far).toBeGreaterThan(0.5);
  expectProjectionMatches(camera);
});

it('respects fixed planes when autoClippingPlanes is disabled', () => {
  const { camera, controls } = setup();
  controls.autoClippingPlanes = false;
  controls.setCurrentCameraSettings({
    nearPlane: 1,
    farPlane: 10,
    eyePosition: [-505, 0, 0],
    targetPosition: [-500, 0, 0],
    upVector: [0, 1, 0],
  });
  controls.update(0);
  expect(camera.near).toBe(1);
  expect(camera.far).toBe(10);
});
