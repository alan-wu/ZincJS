import * as THREE from 'three/webgpu';
import { it, expect, beforeAll, vi } from 'vitest';
import { create as createGPU, globals as gpuGlobals } from 'webgpu';
import { Glyphset } from '../src/primitives/glyphset';
import glyphsetMetadata from './models/timeGlyphs_metadata.json';
import glyphGeometry from './models/timeGlyphs_geometry.json';

// Wraps every Glyph instance as it's constructed so its very first
// setColour() call (during Glyphset.createGlyphs(), synchronous within
// load()) can be observed - there is no public getter for a glyph/label's
// current colour, and by the time load()'s promise resolves that first call
// has already happened, so it can't be spied on the normal post-load way
// (see the first test below for that pattern, used for later resyncs).
const { capturedGlyphs } = vi.hoisted(() => ({ capturedGlyphs: [] }));
vi.mock('../src/primitives/glyph', async (importOriginal) => {
  const actual = await importOriginal();
  function WrappedGlyph(...args) {
    const instance = new actual.Glyph(...args);
    const originalSetColour = instance.setColour;
    instance.setColour = (color) => {
      instance.lastColour = color.clone();
      return originalSetColour(color);
    };
    capturedGlyphs.push(instance);
    return instance;
  }
  WrappedGlyph.prototype = actual.Glyph.prototype;
  return { ...actual, Glyph: WrappedGlyph };
});

// Glyph labels (separate Sprite objects - see glyph.js/label.js) are NOT
// part of the InstancedMesh/compute-buffer rendering path glyphRenderMaterial.js
// draws from, so nothing kept them in sync for GPU-compute-driven (morphVertices)
// glyphsets: applyGlyphComputeResult() used to only write instanceMatrix/
// instanceColor, never touching each Glyph's label position/colour. This
// verifies the fix - an accurate resync (see readbackGlyphComputeOnly/
// dispatchGlyphCompute in glyphset.js) now also calls Glyph.setTransformation/
// setColour with the same values just written into instanceMatrix/instanceColor.
//
// This intentionally avoids exercising real label rendering: three-spritetext's
// SpriteText needs a working canvas 2D context, which happy-dom (this test
// environment) doesn't provide (canvas.getContext('2d') returns null) - no
// other test in this suite renders real labels either. Instead, glyphsetData
// gets a `label` array (so Glyphset.canShowLabel() is true, which is what
// applyGlyphComputeResult() gates the label-sync work on) but load() is
// called with displayLabels=false, so Glyph.showLabel()/SpriteText never
// actually runs - and Glyph.setTransformation/setColour are spied on
// directly instead of inspecting a rendered sprite.

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

async function waitFor(check, timeoutMs = 3000, stepMs = 10) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (check()) return true;
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
  return false;
}

it('resyncs glyph label position and colour along with instanceMatrix/instanceColor', async () => {
  const numberOfVertices = glyphsetMetadata.metadata.number_of_vertices;
  const glyphsetData = {
    ...glyphsetMetadata,
    label: Array.from({ length: numberOfVertices }, (_, i) => `glyph-${i}`),
  };

  const glyphset = new Glyphset();
  glyphset.setRegion({ getScene: () => ({ getRenderer: () => webgpuRenderer }) });

  await new Promise((resolve, reject) => {
    // displayLabels=false: avoids Glyph.showLabel()/SpriteText (which needs
    // a real canvas 2D context, unavailable in this test environment) - the
    // `label` array above is enough on its own for canShowLabel() to gate
    // the label-sync work on, independent of whether labels are displayed.
    glyphset.load(glyphsetData, glyphGeometry, resolve, true, false);
    setTimeout(() => reject(new Error('glyphset.load() did not call back')), 5000);
  });
  glyphset.duration = 1;
  expect(glyphset.canShowLabel()).toBeTruthy();

  const glyphs = [];
  glyphset.forEachGlyph((glyph) => glyphs.push(glyph));
  expect(glyphs.length).toBe(numberOfVertices);

  // Spy on glyph 0's setTransformation/setColour, cloning arguments
  // synchronously at call time (applyGlyphComputeResult reuses one shared
  // _bot_colour THREE.Color across the whole per-instance colour loop -
  // capturing the raw reference instead of a clone would end up observing
  // whatever the LAST instance's colour was, not glyph 0's).
  const glyph0 = glyphs[0];
  let capturedTransform;
  const originalSetTransformation = glyph0.setTransformation;
  glyph0.setTransformation = (position, axis1, axis2, axis3) => {
    capturedTransform = { position: [...position], axis1: [...axis1], axis2: [...axis2], axis3: [...axis3] };
    return originalSetTransformation(position, axis1, axis2, axis3);
  };
  let capturedColour;
  const originalSetColour = glyph0.setColour;
  glyph0.setColour = (color) => {
    capturedColour = color.clone();
    return originalSetColour(color);
  };

  const matrixArray = glyphset.morph.instanceMatrix.array;
  const beforeMatrix = matrixArray.slice();

  // Move to a keyframe where position/colour actually differ, and wait for
  // the debounced accurate resync (setMorphTime) to land.
  const numberOfTimeSteps = glyphsetData.metadata.number_of_time_steps;
  glyphset.setMorphTime(2 / (numberOfTimeSteps - 1));
  const resynced = await waitFor(() => !matrixArray.every((v, i) => v === beforeMatrix[i]));
  expect(resynced, 'instanceMatrix was never resynced').toBe(true);

  expect(capturedTransform, 'Glyph.setTransformation was never called during the resync').toBeDefined();
  expect(capturedColour, 'Glyph.setColour was never called during the resync').toBeDefined();

  // The captured label position/colour must match the resynced
  // instanceMatrix/instanceColor for the same instance (0).
  const transformMatrix = new THREE.Matrix4();
  const instancePosition = new THREE.Vector3();
  glyphset.morph.getMatrixAt(0, transformMatrix);
  instancePosition.setFromMatrixPosition(transformMatrix);
  expect(capturedTransform.position[0]).toBeCloseTo(instancePosition.x, 5);
  expect(capturedTransform.position[1]).toBeCloseTo(instancePosition.y, 5);
  expect(capturedTransform.position[2]).toBeCloseTo(instancePosition.z, 5);

  // instanceColor is intentionally never created for glyphsets whose
  // colour is GPU-compute-driven (see applyGlyphComputeResult's comment),
  // so the expected colour is computed straight from the fixture's raw
  // per-keyframe data instead of reading it back off the mesh.
  // setMorphTime(2 / (numberOfTimeSteps - 1)) with duration=1 lands exactly
  // on keyframe 2 (bottom_frame === top_frame === 2, proportion === 1), so
  // no blending is needed for the expected value.
  const expectedColour = new THREE.Color().setHex(glyphsetMetadata.colors['2'][0]);
  expect(capturedColour.r).toBeCloseTo(expectedColour.r, 5);
  expect(capturedColour.g).toBeCloseTo(expectedColour.g, 5);
  expect(capturedColour.b).toBeCloseTo(expectedColour.b, 5);
});

it('labels already have the correct colour right after load, before any resync', async () => {
  const numberOfVertices = glyphsetMetadata.metadata.number_of_vertices;
  const glyphsetData = {
    ...glyphsetMetadata,
    label: Array.from({ length: numberOfVertices }, (_, i) => `glyph-${i}`),
  };

  capturedGlyphs.length = 0;
  const glyphset = new Glyphset();
  glyphset.setRegion({ getScene: () => ({ getRenderer: () => webgpuRenderer }) });

  await new Promise((resolve, reject) => {
    glyphset.load(glyphsetData, glyphGeometry, resolve, true, false);
    setTimeout(() => reject(new Error('glyphset.load() did not call back')), 5000);
  });

  // Nothing has called setMorphTime()/render() yet - createGlyphs() (run
  // synchronously inside load()) must have set each label's colour from the
  // frame-0 data on its own, since a GPU-compute-driven glyphset's first
  // accurate resync doesn't happen until setMorphTime()/pause is called.
  expect(capturedGlyphs.length).toBe(numberOfVertices);
  const expectedColour = new THREE.Color().setHex(glyphsetMetadata.colors['0'][0]);
  expect(capturedGlyphs[0].lastColour, 'Glyph.setColour was never called at load time').toBeDefined();
  expect(capturedGlyphs[0].lastColour.r).toBeCloseTo(expectedColour.r, 5);
  expect(capturedGlyphs[0].lastColour.g).toBeCloseTo(expectedColour.g, 5);
  expect(capturedGlyphs[0].lastColour.b).toBeCloseTo(expectedColour.b, 5);

  // instanceColor must still stay uncreated - the whole point of routing
  // this through updateGlyphsetHexColors(colors, labelsOnly=true) instead
  // of the normal path.
  expect(glyphset.morph.instanceColor).toBeNull();
});
