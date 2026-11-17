import * as THREE from 'three/webgpu';
import { it, expect } from 'vitest';
import { CameraControls } from '../src/controls';

const makeBox = (half) =>
  new THREE.Box3(new THREE.Vector3(-half, -half, -half), new THREE.Vector3(half, half, half));

const setup = (box = makeBox(10)) => {
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
  const scene = { getBoundingBox: () => box, getNormalisedMinimapCoordinates: () => undefined };
  const domElement = document.createElement('div');
  const controls = new CameraControls(camera, domElement, undefined, scene);
  controls.calculateMaxAllowedDistance(scene);
  controls.setCurrentCameraSettings({
    eyePosition: [0, 0, 50],
    targetPosition: [0, 0, 0],
    upVector: [0, 1, 0],
  });
  controls.update(0);
  return { camera, controls, domElement };
};

const isFinite3 = (v) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);

it('handles a zero rotation axis without producing NaN', () => {
  const { camera, controls } = setup();
  const axis = new THREE.Vector3(0, 0, 0);
  controls.rotateAboutLookAtpoint(axis, Math.PI);
  expect(isFinite3(camera.position)).toBe(true);
  expect(isFinite3(camera.up)).toBe(true);
  // A half turn about a perpendicular axis puts the eye on the opposite side
  expect(camera.position.z).toBeCloseTo(-50, 6);
  expect(camera.position.distanceTo(camera.target)).toBeCloseTo(50, 6);
  // Zero axis with zero angle is a no-op
  controls.rotateAboutLookAtpoint(axis, 0);
  expect(camera.position.z).toBeCloseTo(-50, 6);
});

it('does not modify the caller axis', () => {
  const { controls } = setup();
  const axis = new THREE.Vector3(0, 3, 0);
  controls.rotateAboutLookAtpoint(axis, 0.1);
  expect(axis.y).toBe(3);
});

it('keeps up orthonormal and the orbit distance constant over many rotations', () => {
  const { camera, controls } = setup();
  const axis = new THREE.Vector3(0.3, 0.7, 0.2);
  for (let i = 0; i < 10000; i++) {
    axis.set(Math.sin(i), Math.cos(i * 0.7), 0.5);
    controls.rotateAboutLookAtpoint(axis, 0.01);
  }
  const view = camera.target.clone().sub(camera.position).normalize();
  expect(camera.up.length()).toBeCloseTo(1, 10);
  expect(Math.abs(camera.up.dot(view))).toBeLessThan(1e-10);
  expect(camera.position.distanceTo(camera.target)).toBeCloseTo(50, 6);
});

it('orthonormalises a tilted up vector after rotating', () => {
  const { camera, controls } = setup();
  controls.setCurrentCameraSettings({ upVector: [0, 1, 1] });
  controls.rotateAboutLookAtpoint(new THREE.Vector3(0, 1, 0), 0.2);
  const view = camera.target.clone().sub(camera.position).normalize();
  expect(camera.up.length()).toBeCloseTo(1, 10);
  expect(Math.abs(camera.up.dot(view))).toBeLessThan(1e-10);
});

it('scales the closest zoom distance with the scene size', () => {
  for (const half of [1e-3, 1, 1e4]) {
    const { camera, controls } = setup(makeBox(half));
    controls.setCurrentCameraSettings({
      eyePosition: [0, 0, half * 5],
      targetPosition: [0, 0, 0],
    });
    for (let i = 0; i < 2000; i++) controls.changeZoomByValue(-50);
    const dist = camera.position.distanceTo(camera.target);
    const radius = half * Math.sqrt(3);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(radius * 1e-3);
    expect(dist).toBeGreaterThanOrEqual(radius * 1e-4 * 0.5);
  }
});

it('zooms without throwing before the canvas rect is known', () => {
  const { camera, controls } = setup();
  expect(() => controls.changeZoomByValue(-50)).not.toThrow();
  expect(camera.position.distanceTo(camera.target)).toBeLessThan(50);
});

// happy-dom never fires IntersectionObserver callbacks, report a 400x400 canvas.
const withCanvasRect = (fn) => {
  const original = globalThis.IntersectionObserver;
  globalThis.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {
      this.callback([{ boundingClientRect: { left: 0, top: 0, width: 400, height: 400 } }]);
    }
    disconnect() {}
  };
  try {
    fn();
  } finally {
    globalThis.IntersectionObserver = original;
  }
};

const drag = (controls, domElement, from, to) => {
  domElement.dispatchEvent(
    new MouseEvent('mousedown', { button: 0, clientX: from[0], clientY: from[1] }),
  );
  domElement.dispatchEvent(new MouseEvent('mousemove', { clientX: to[0], clientY: to[1] }));
  controls.update(0);
  domElement.dispatchEvent(new MouseEvent('mouseup', { clientX: to[0], clientY: to[1] }));
};

it('rolls about the view axis when dragging along the trackball edge', () => {
  withCanvasRect(() => {
    const { camera, controls, domElement } = setup();
    // Vertical drag at the right edge of the canvas
    drag(controls, domElement, [395, 210], [395, 190]);
    // Mostly a roll: the eye barely moves but up turns within the screen plane
    expect(camera.position.distanceTo(new THREE.Vector3(0, 0, 50))).toBeLessThan(2);
    expect(Math.abs(camera.up.x)).toBeGreaterThan(0.1);
  });
});

it('does not roll when dragging through the trackball centre', () => {
  withCanvasRect(() => {
    const { camera, controls, domElement } = setup();
    // Vertical drag through the centre is a pure pitch
    drag(controls, domElement, [199.5, 210], [199.5, 190]);
    expect(Math.abs(camera.up.x)).toBeLessThan(1e-10);
    expect(Math.abs(camera.position.y)).toBeGreaterThan(1);
  });
});
