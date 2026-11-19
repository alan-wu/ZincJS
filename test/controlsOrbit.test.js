import * as THREE from 'three/webgpu';
import { it, expect } from 'vitest';
import { CameraControls } from '../src/controls';
import { InstancedPoints } from '../src/three/InstancedPoints';

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

it('rotateAboutPoint at the target matches rotateAboutLookAtpoint', () => {
  const a = setup();
  const b = setup();
  const axis = new THREE.Vector3(0.2, 1, 0.4);
  a.controls.rotateAboutLookAtpoint(axis, 0.7);
  b.controls.rotateAboutPoint(axis, 0.7, b.camera.target.clone());
  expect(b.camera.position.distanceTo(a.camera.position)).toBeLessThan(1e-9);
  expect(b.camera.up.distanceTo(a.camera.up)).toBeLessThan(1e-9);
  expect(b.camera.target.distanceTo(a.camera.target)).toBeLessThan(1e-9);
});

// A small cube off to the side of the camera target
const setupWithMesh = (pivotOnPick) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), new THREE.MeshBasicMaterial());
  mesh.position.set(10, 0, 0);
  mesh.updateMatrixWorld();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
  const scene = {
    getBoundingBox: () => makeBox(12),
    getNormalisedMinimapCoordinates: () => undefined,
    getPickableThreeJSObjects: () => [mesh],
  };
  const domElement = document.createElement('div');
  const controls = new CameraControls(camera, domElement, undefined, scene);
  controls.pivotOnPick = pivotOnPick;
  controls.calculateMaxAllowedDistance(scene);
  controls.setCurrentCameraSettings({
    eyePosition: [0, 0, 50],
    targetPosition: [0, 0, 0],
    upVector: [0, 1, 0],
  });
  controls.update(0);
  camera.updateMatrixWorld();
  return { camera, controls, domElement };
};

const toScreen = (camera, point) => {
  camera.updateMatrixWorld();
  const ndc = point.clone().project(camera);
  return new THREE.Vector2(((ndc.x + 1) * 400) / 2, ((1 - ndc.y) * 400) / 2);
};

// Point on the front face of the cube, used as the drag start
const facePoint = new THREE.Vector3(10, 0, 2);

it('orbits around the picked point when pivotOnPick is enabled', () => {
  withCanvasRect(() => {
    const { camera, controls, domElement } = setupWithMesh(true);
    const start = toScreen(camera, facePoint);
    const eyeToPivot = camera.position.distanceTo(facePoint);
    drag(controls, domElement, [start.x, start.y], [start.x + 40, start.y]);
    const after = toScreen(camera, facePoint);
    // The picked point stays fixed on screen and at the same distance
    expect(after.distanceTo(start)).toBeLessThan(1e-3);
    expect(camera.position.distanceTo(facePoint)).toBeCloseTo(eyeToPivot, 6);
    expect(camera.position.distanceTo(new THREE.Vector3(0, 0, 50))).toBeGreaterThan(1);
  });
});

it('orbits around the target when pivotOnPick is disabled or nothing is hit', () => {
  withCanvasRect(() => {
    const { camera, controls, domElement } = setupWithMesh(false);
    const start = toScreen(camera, facePoint);
    drag(controls, domElement, [start.x, start.y], [start.x + 40, start.y]);
    expect(toScreen(camera, facePoint).distanceTo(start)).toBeGreaterThan(1);
    expect(camera.target.length()).toBeLessThan(1e-9);
  });
  withCanvasRect(() => {
    const { camera, controls, domElement } = setupWithMesh(true);
    // Start the drag on empty space
    drag(controls, domElement, [50, 200], [90, 200]);
    expect(camera.target.length()).toBeLessThan(1e-9);
    expect(camera.position.distanceTo(camera.target)).toBeCloseTo(50, 6);
  });
});

it('picks a pointset as the pivot within its drawn point size', () => {
  withCanvasRect(() => {
    // One point drawn with a pick radius of 1 world unit (10 px * 0.1)
    const points = new InstancedPoints(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial(),
      1,
    );
    points.pointPositions = new Float32Array([10, 0, 0]);
    points.pointSize = 10;
    points.sizePerPixel = 0.1;
    points.updateMatrixWorld();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
    const scene = {
      getBoundingBox: () => makeBox(12),
      getNormalisedMinimapCoordinates: () => undefined,
      getPickableThreeJSObjects: () => [points],
    };
    const domElement = document.createElement('div');
    const controls = new CameraControls(camera, domElement, undefined, scene);
    controls.pivotOnPick = true;
    controls.calculateMaxAllowedDistance(scene);
    controls.setCurrentCameraSettings({
      eyePosition: [0, 0, 50],
      targetPosition: [0, 0, 0],
      upVector: [0, 1, 0],
    });
    controls.update(0);
    // Start half a world unit away from the point centre, inside its drawn size
    const start = toScreen(camera, new THREE.Vector3(10, 0.5, 0));
    drag(controls, domElement, [start.x, start.y], [start.x + 40, start.y]);
    // Orbiting about the point moves the camera target away from the origin
    expect(camera.target.length()).toBeGreaterThan(0.1);
  });
});

it('uses the pivot as the trackball centre and line of sight', () => {
  withCanvasRect(() => {
    const { camera, controls, domElement } = setupWithMesh(true);
    const start = toScreen(camera, facePoint);
    // The pivot is off-centre, a vertical drag starting on it must tilt about
    // an axis perpendicular to the line of sight to the pivot, with no roll.
    const up0 = camera.up.clone();
    const sight = camera.position.clone().sub(facePoint);
    const sideways = up0.clone().cross(sight).normalize();
    drag(controls, domElement, [start.x, start.y], [start.x, start.y - 40]);
    expect(Math.abs(camera.up.dot(sideways))).toBeLessThan(1e-6);
    expect(camera.position.distanceTo(new THREE.Vector3(0, 0, 50))).toBeGreaterThan(1);
    expect(toScreen(camera, facePoint).distanceTo(start)).toBeLessThan(1e-3);
  });
});

// Render the overlay into a fake renderer and return the drawn scene.
const renderOverlay = (controls) => {
  let drawn = undefined;
  controls.renderOverlay({ render: (scene, camera) => (drawn = { scene, camera }) });
  return drawn;
};

it('shows the trackball gizmo at the pivot while rotating about it', () => {
  withCanvasRect(() => {
    const { camera, controls, domElement } = setupWithMesh(true);
    const start = toScreen(camera, facePoint);
    domElement.dispatchEvent(
      new MouseEvent('mousedown', { button: 0, clientX: start.x, clientY: start.y }),
    );
    domElement.dispatchEvent(
      new MouseEvent('mousemove', { clientX: start.x + 10, clientY: start.y }),
    );
    expect(controls.update(0)).toBe(true);
    const drawn = renderOverlay(controls);
    expect(drawn).toBeDefined();
    // The camera facing ring is drawn at the trackball radius around the pivot
    let outerRing = undefined;
    drawn.scene.traverse((object) => {
      if (object.isLine && object.material.color.getHex() === 0x555555) outerRing = object;
    });
    const pivotOnScreen = toScreen(camera, facePoint);
    const edge = new THREE.Vector3(1, 0, 0).applyMatrix4(outerRing.matrixWorld);
    const radiusPixels = toScreen(camera, edge).distanceTo(pivotOnScreen);
    // The 200 pixel trackball radius scaled by trackballGizmoScale
    const expected = 200 * controls.trackballGizmoScale;
    expect(radiusPixels).toBeGreaterThan(expected * 0.95);
    expect(radiusPixels).toBeLessThan(expected * 1.05);
    // The overlay camera encloses the gizmo
    expect(drawn.camera.near).toBeGreaterThan(0);
    expect(drawn.camera.far).toBeGreaterThan(drawn.camera.near);

    // Releasing the mouse hides it and asks for a render
    domElement.dispatchEvent(
      new MouseEvent('mouseup', { clientX: start.x + 10, clientY: start.y }),
    );
    expect(controls.update(0)).toBe(true);
    expect(renderOverlay(controls)).toBeUndefined();
  });
});

// Screen position of the gizmo centre, where its pivot dot is drawn.
const gizmoCentreOnScreen = (drawn, camera) => {
  let dot = undefined;
  drawn.scene.traverse((object) => {
    if (object.isMesh) dot = object;
  });
  return toScreen(camera, dot.getWorldPosition(new THREE.Vector3()));
};

it('shows the trackball gizmo on the camera target when rotating on empty space', () => {
  withCanvasRect(() => {
    const { camera, controls, domElement } = setupWithMesh(true);
    domElement.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 50, clientY: 200 }));
    domElement.dispatchEvent(new MouseEvent('mousemove', { clientX: 90, clientY: 200 }));
    controls.update(0);
    const drawn = renderOverlay(controls);
    expect(drawn).toBeDefined();
    const centre = gizmoCentreOnScreen(drawn, camera);
    expect(centre.distanceTo(toScreen(camera, camera.target))).toBeLessThan(1e-3);
  });
});

it('shows the trackball gizmo on the camera target while panning', () => {
  withCanvasRect(() => {
    const { camera, controls, domElement } = setupWithMesh(true);
    domElement.dispatchEvent(
      new MouseEvent('mousedown', { button: 0, shiftKey: true, clientX: 200, clientY: 200 }),
    );
    domElement.dispatchEvent(new MouseEvent('mousemove', { clientX: 240, clientY: 200 }));
    controls.update(0);
    // The target has moved with the pan and the gizmo follows it
    expect(camera.target.length()).toBeGreaterThan(1e-3);
    const drawn = renderOverlay(controls);
    expect(drawn).toBeDefined();
    const centre = gizmoCentreOnScreen(drawn, camera);
    expect(centre.distanceTo(toScreen(camera, camera.target))).toBeLessThan(1e-3);
    domElement.dispatchEvent(new MouseEvent('mouseup', { clientX: 240, clientY: 200 }));
    controls.update(0);
    expect(renderOverlay(controls)).toBeUndefined();
  });
});

it('keeps the trackball gizmo visible briefly after a wheel zoom', async () => {
  let controls = undefined;
  withCanvasRect(() => {
    const setupResult = setupWithMesh(true);
    controls = setupResult.controls;
    controls.trackballGizmoLinger = 40;
    setupResult.domElement.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 }));
    expect(controls.update(0)).toBe(true);
  });
  expect(renderOverlay(controls)).toBeDefined();
  await new Promise((resolve) => setTimeout(resolve, 80));
  // Hiding it once the time has passed asks for a render
  expect(controls.update(0)).toBe(true);
  expect(renderOverlay(controls)).toBeUndefined();
});

it('does not show the trackball gizmo when disabled', () => {
  withCanvasRect(() => {
    const { camera, controls, domElement } = setupWithMesh(true);
    controls.showTrackballGizmo = false;
    const start = toScreen(camera, facePoint);
    drag(controls, domElement, [start.x, start.y], [start.x + 10, start.y]);
    domElement.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 }));
    controls.update(0);
    expect(controls.getTrackballGizmo()).toBeUndefined();
  });
});

it('does not show the trackball gizmo for clicks or small jitter', () => {
  withCanvasRect(() => {
    const { camera, controls, domElement } = setupWithMesh(true);
    const start = toScreen(camera, facePoint);
    // A click on the model, held for a few frames without moving
    domElement.dispatchEvent(
      new MouseEvent('mousedown', { button: 0, clientX: start.x, clientY: start.y }),
    );
    controls.update(0);
    controls.update(0);
    domElement.dispatchEvent(new MouseEvent('mouseup', { clientX: start.x, clientY: start.y }));
    controls.update(0);
    expect(controls.getTrackballGizmo()).toBeUndefined();

    // A selection with a little hand jitter, then a real drag
    domElement.dispatchEvent(
      new MouseEvent('mousedown', { button: 0, clientX: start.x, clientY: start.y }),
    );
    domElement.dispatchEvent(
      new MouseEvent('mousemove', { clientX: start.x + 2, clientY: start.y }),
    );
    controls.update(0);
    expect(renderOverlay(controls)).toBeUndefined();
    domElement.dispatchEvent(
      new MouseEvent('mousemove', { clientX: start.x + 12, clientY: start.y }),
    );
    controls.update(0);
    expect(renderOverlay(controls)).toBeDefined();
    domElement.dispatchEvent(
      new MouseEvent('mouseup', { clientX: start.x + 12, clientY: start.y }),
    );
    controls.update(0);

    // The next click starts from no movement again
    domElement.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 50, clientY: 200 }));
    controls.update(0);
    expect(renderOverlay(controls)).toBeUndefined();
  });
});
