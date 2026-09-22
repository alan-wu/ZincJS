import * as THREE from 'three/webgpu';
import { describe, it, expect, beforeAll } from 'vitest';
import { create as createGPU, globals as gpuGlobals } from 'webgpu';
import { Glyphset } from '../src/primitives/glyphset';
import glyphsetData from './models/timeGlyphs_metadata.json';
import glyphGeometry from './models/timeGlyphs_geometry.json';

// Verifies the "render straight from the GPU compute buffers while
// animating, only resync instanceMatrix/instanceColor exactly once paused"
// design: while playAnimation is true, render() must not touch
// instanceMatrix/instanceColor, getBoundingBox() must fall back to the
// conservative all-keyframes box, and raycast must be disabled; once
// playAnimation flips back to false, exactly one accurate resync must
// happen, restoring exact bounding-box and default InstancedMesh.raycast.
//
// Uses a real WebGPU device to actually build/dispatch the render
// material's positionNode/colorNode and confirm rendering doesn't throw,
// same harness pattern as webgpuShaderBuild.test.js.

function createFakeCanvasContext(device, width, height) {
  let texture;
  return {
    configure(descriptor) {
      if (texture) texture.destroy();
      texture = device.createTexture({ size: [width, height], format: descriptor.format, usage: descriptor.usage });
    },
    unconfigure() { if (texture) { texture.destroy(); texture = undefined; } },
    getCurrentTexture() { return texture; },
  };
}

let webgpuRenderer;

beforeAll(async () => {
  Object.assign(globalThis, gpuGlobals);
  const gpu = createGPU([]);
  navigator.gpu = gpu;
  const adapter = await gpu.requestAdapter();
  const device = await adapter.requestDevice({
    requiredLimits: { maxStorageBuffersPerShaderStage: adapter.limits.maxStorageBuffersPerShaderStage },
  });
  const context = createFakeCanvasContext(device, 4, 4);
  webgpuRenderer = new THREE.WebGPURenderer({ device, context });
  await webgpuRenderer.init();
  webgpuRenderer.setSize(4, 4);
});

async function waitFor(check, timeoutMs = 3000, stepMs = 10) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (check()) return true;
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
  return false;
}

it('renders straight from GPU buffers while animating, then does one accurate resync on pause', async () => {
  const glyphset = new Glyphset();
  glyphset.setRegion({ getScene: () => ({ getRenderer: () => webgpuRenderer }) });

  await new Promise((resolve, reject) => {
    glyphset.load(glyphsetData, glyphGeometry, resolve, true, false);
    setTimeout(() => reject(new Error('glyphset.load() did not call back')), 5000);
  });

  glyphset.duration = 1;

  const scene = new THREE.Scene();
  scene.add(glyphset.getGroup());
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);

  // First render() call (playAnimation true) also lazily populates the
  // render buffers - do it, then render the scene to confirm the custom
  // positionNode/colorNode material builds and draws without throwing.
  glyphset.render(0.01, true, {});
  expect(() => webgpuRenderer.render(scene, camera)).not.toThrow();

  const matrixArray = glyphset.morph.instanceMatrix.array;
  const beforeAnimating = matrixArray.slice();

  // Drive a few more animating frames.
  for (let i = 0; i < 5; i++) {
    glyphset.render(0.05, true, {});
  }

  // instanceMatrix must NOT have been touched by the fast path.
  expect(matrixArray.every((v, i) => v === beforeAnimating[i]), 'instanceMatrix was mutated while animating').toBe(true);

  // Bounding box must fall back to the conservative all-keyframes box, not
  // recompute (stale) per-instance bounds.
  const boxWhileAnimating = glyphset.getBoundingBox();
  expect(boxWhileAnimating).toBeDefined();

  // Raycast must be disabled while animating.
  const raycastResultsWhileAnimating = [];
  const fakeRaycaster = {
    ray: { intersectSphere: () => null },
    params: { Points: { threshold: 1 }, Line: { threshold: 1 } },
    camera,
  };
  expect(() => glyphset.morph.raycast(fakeRaycaster, raycastResultsWhileAnimating)).not.toThrow();
  expect(raycastResultsWhileAnimating.length).toBe(0);
  expect(glyphset.morph.raycast).not.toBe(THREE.InstancedMesh.prototype.raycast);

  // Stop animating: the very next render() call should trigger exactly one
  // accurate resync.
  glyphset.render(0, false, {});

  const resynced = await waitFor(() => !matrixArray.every((v, i) => v === beforeAnimating[i]));
  expect(resynced, 'instanceMatrix was never resynced after pausing').toBe(true);

  // Raycast should be restored to the stock InstancedMesh implementation.
  expect(glyphset.morph.raycast).toBe(THREE.InstancedMesh.prototype.raycast);
});
