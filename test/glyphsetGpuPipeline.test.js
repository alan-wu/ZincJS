import * as THREE from 'three/webgpu';
import { describe, it, expect, beforeAll } from 'vitest';
import { create as createGPU, globals as gpuGlobals } from 'webgpu';
import { Glyphset } from '../src/primitives/glyphset';
import glyphsetData from './models/timeGlyphs_metadata.json';
import glyphGeometry from './models/timeGlyphs_geometry.json';

// End-to-end regression test for the full GPU glyph-transform pipeline:
// Glyphset.load() -> setMorphTime() -> async compute dispatch ->
// applyGlyphComputeResult() -> instanceMatrix/instanceColor. The sibling
// glyphTransformCompute.*.test.js files only check the compute shader's own
// output in isolation; they would not have caught a real bug this project
// shipped where applyGlyphComputeResult() read the (vec3-padded-to-vec4)
// GPU readback with the wrong stride - instance 0 happened to read
// correctly by coincidence (offset 0 is valid either way), but every later
// instance was garbled. This test uses real multi-instance, multi-keyframe
// data (test/models/timeGlyphs_metadata.json + timeGlyphs_geometry.json,
// 8 glyphs x 4 keyframes) specifically so that class of bug shows up.

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

function lerp3(a, b, proportion) {
  return [0, 1, 2].map((j) => proportion * a[j] + (1 - proportion) * b[j]);
}

// Direct port of resolve_glyph_axes()'s NONE/MIRROR branch, parameterized
// by this file's metadata (repeat_mode is "NONE" here).
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
  const finalPoint = [0, 1, 2].map((j) => point[j]
    + offset[0] * finalAxis1[j] + offset[1] * finalAxis2[j] + offset[2] * finalAxis3[j]);
  return finalPoint;
}

async function waitForCondition(check, timeoutMs = 3000, stepMs = 10) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (check()) return true;
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
  return false;
}

it('writes correct per-instance transforms into instanceMatrix for every glyph, not just the first', async () => {
  const glyphset = new Glyphset();
  // Duck-typed region/scene stand-in - just enough for
  // this.region.getScene().getRenderer() to resolve to a real renderer.
  glyphset.setRegion({ getScene: () => ({ getRenderer: () => webgpuRenderer }) });

  await new Promise((resolve, reject) => {
    glyphset.load(glyphsetData, glyphGeometry, resolve, true, false);
    // load() with isInline=true completes synchronously via meshloader, but
    // keep a safety net in case that ever changes.
    setTimeout(() => reject(new Error('glyphset.load() did not call back')), 5000);
  });

  const numberOfVertices = glyphsetData.metadata.number_of_vertices;
  expect(glyphset.morph.count).toBe(numberOfVertices);

  // Move to a non-trivial midpoint between keyframes 1 and 2 so the
  // interpolation actually blends two different keyframes' data.
  const bottomFrame = 1;
  const topFrame = 2;
  const proportion = 0.5;
  const numberOfTimeSteps = glyphsetData.metadata.number_of_time_steps;
  glyphset.duration = 1;
  glyphset.setMorphTime((bottomFrame + (1 - proportion)) / (numberOfTimeSteps - 1));

  const matrixArray = glyphset.morph.instanceMatrix.array;
  // Snapshot before the async GPU result lands, to detect the update.
  const before = matrixArray.slice();

  const updated = await waitForCondition(() => !matrixArray.every((v, i) => v === before[i]));
  expect(updated, 'instanceMatrix was never updated by the GPU compute readback').toBe(true);

  const transformMatrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  for (let record = 0; record < numberOfVertices; record++) {
    const expected = expectedPoint(record, bottomFrame, topFrame, proportion);
    glyphset.morph.getMatrixAt(record, transformMatrix);
    position.setFromMatrixPosition(transformMatrix);
    expect(position.x, `record ${record} x`).toBeCloseTo(expected[0], 4);
    expect(position.y, `record ${record} y`).toBeCloseTo(expected[1], 4);
    expect(position.z, `record ${record} z`).toBeCloseTo(expected[2], 4);
  }
});
