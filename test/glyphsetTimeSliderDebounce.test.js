import * as THREE from 'three/webgpu';
import { it, expect, beforeAll } from 'vitest';
import { create as createGPU, globals as gpuGlobals } from 'webgpu';
import { Glyphset } from '../src/primitives/glyphset';
import glyphsetData from './models/timeGlyphs_metadata.json';
import glyphGeometry from './models/timeGlyphs_geometry.json';

// Verifies setMorphTime()'s debounced accurate resync (behind a downstream
// slider calling setMorphTime() many times a second while being dragged):
// instanceMatrix must NOT update on every call (that would mean a GPU->CPU
// readback per slider tick), only once dragging has been quiet for the
// debounce window - and a burst of calls must collapse into exactly one
// readback reflecting the LAST call, not one per call.

let webgpuRenderer;

beforeAll(async () => {
  Object.assign(globalThis, gpuGlobals);
  const gpu = createGPU([]);
  navigator.gpu = gpu;
  const adapter = await gpu.requestAdapter();
  const device = await adapter.requestDevice({
    requiredLimits: { maxStorageBuffersPerShaderStage: adapter.limits.maxStorageBuffersPerShaderStage },
  });
  webgpuRenderer = new THREE.WebGPURenderer({ device });
  await webgpuRenderer.init();
});

async function loadGlyphset() {
  const glyphset = new Glyphset();
  glyphset.setRegion({ getScene: () => ({ getRenderer: () => webgpuRenderer }) });
  await new Promise((resolve, reject) => {
    glyphset.load(glyphsetData, glyphGeometry, resolve, true, false);
    setTimeout(() => reject(new Error('glyphset.load() did not call back')), 5000);
  });
  glyphset.duration = 1;
  return glyphset;
}

async function waitFor(check, timeoutMs = 3000, stepMs = 10) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (check()) return true;
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
  return false;
}

it('does not touch instanceMatrix immediately, then resyncs once the slider goes quiet', async () => {
  const glyphset = await loadGlyphset();
  const numberOfTimeSteps = glyphsetData.metadata.number_of_time_steps;
  const matrixArray = glyphset.morph.instanceMatrix.array;
  const before = matrixArray.slice();

  glyphset.setMorphTime((1 + 0.5) / (numberOfTimeSteps - 1));

  // Immediately after the call, instanceMatrix must still be untouched -
  // only the GPU compute buffers (driving the live render) update
  // synchronously; the CPU readback is debounced.
  expect(matrixArray.every((v, i) => v === before[i]), 'instanceMatrix changed before the debounce window elapsed').toBe(true);

  const resynced = await waitFor(() => !matrixArray.every((v, i) => v === before[i]));
  expect(resynced, 'instanceMatrix was never resynced after the debounce window').toBe(true);
});

function lerp3(a, b, proportion) {
  return [0, 1, 2].map((j) => proportion * a[j] + (1 - proportion) * b[j]);
}

// Same NONE-mode resolve_glyph_axes() reference used in
// glyphsetGpuPipeline.test.js, parameterized by bottom/top/proportion so it
// can check whichever frame a burst of setMorphTime() calls should settle on.
function expectedPoint(record, bottomFrame, topFrame, proportion) {
  const { positions, axis1, axis2, axis3, scale } = glyphsetData;
  const { base_size: baseSize, offset, scale_factors: scaleFactors } = glyphsetData.metadata;
  const globalScale = 1;
  const o = record * 3;
  const pick = (obj, frame) => obj[frame.toString()].slice(o, o + 3);

  const point = lerp3(pick(positions, bottomFrame), pick(positions, topFrame), proportion);
  const a1 = lerp3(pick(axis1, bottomFrame), pick(axis1, topFrame), proportion);
  const a2 = lerp3(pick(axis2, bottomFrame), pick(axis2, topFrame), proportion);
  const a3 = lerp3(pick(axis3, bottomFrame), pick(axis3, topFrame), proportion);
  const sc = lerp3(pick(scale, bottomFrame), pick(scale, topFrame), proportion);

  const axisScale = [0, 1, 2].map((j) => ((sc[j] < 0 ? -1 : 1) * baseSize[j] + sc[j] * scaleFactors[j]) * globalScale);
  const finalAxis1 = a1.map((v) => v * axisScale[0]);
  const finalAxis2 = a2.map((v) => v * axisScale[1]);
  const finalAxis3 = a3.map((v) => v * axisScale[2]);
  return [0, 1, 2].map((j) => point[j]
    + offset[0] * finalAxis1[j] + offset[1] * finalAxis2[j] + offset[2] * finalAxis3[j]);
}

it('collapses a burst of setMorphTime calls into one resync matching the last call', async () => {
  const glyphset = await loadGlyphset();
  const numberOfTimeSteps = glyphsetData.metadata.number_of_time_steps;
  const matrixArray = glyphset.morph.instanceMatrix.array;
  const before = matrixArray.slice();

  // Simulate several rapid slider ticks landing within the debounce window -
  // each earlier one should get superseded, never applied on its own.
  const bottomFrame = 1;
  const proportions = [0.9, 0.7, 0.5, 0.3, 0.1];
  for (const proportion of proportions) {
    const current_time = bottomFrame + (1 - proportion);
    glyphset.setMorphTime(current_time / (numberOfTimeSteps - 1));
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  const lastProportion = proportions[proportions.length - 1];

  const resynced = await waitFor(() => !matrixArray.every((v, i) => v === before[i]));
  expect(resynced, 'instanceMatrix was never resynced after the burst went quiet').toBe(true);

  const expected = expectedPoint(0, bottomFrame, bottomFrame + 1, lastProportion);
  const transformMatrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  glyphset.morph.getMatrixAt(0, transformMatrix);
  position.setFromMatrixPosition(transformMatrix);

  expect(position.x).toBeCloseTo(expected[0], 4);
  expect(position.y).toBeCloseTo(expected[1], 4);
  expect(position.z).toBeCloseTo(expected[2], 4);
});
