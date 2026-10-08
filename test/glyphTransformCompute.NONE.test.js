import * as THREE from 'three/webgpu';
import { describe, it, expect, beforeAll } from 'vitest';
import { create as createGPU, globals as gpuGlobals } from 'webgpu';
import {
  createGlyphTransformCompute,
  dispatchAndReadbackGlyphTransform,
} from '../src/tsl/glyphTransform';
import { runRepeatModeCheck } from './glyphTransformReference';

// Verifies the TSL compute-shader port of glyphset.js's resolve_glyph_axes()
// (plus the keyframe blend from updateMorphGlyphsets()) against a direct JS
// reference implementation, for repeat_mode "NONE", using a real WebGPU
// device (same harness pattern as webgpuShaderBuild.test.js).
//
// This is split into one file per repeat_mode (see the sibling
// glyphTransformCompute.*.test.js files) rather than one file covering all
// four, because the test-only Node WebGPU backend has been observed to
// crash natively ("futex facility returned an unexpected error code") after
// a handful of GPU round trips run back to back within a single process -
// regardless of whether those round trips are separate it() blocks, a
// describe.each, or a plain loop inside one test. Splitting across files
// puts each mode in its own vitest worker process (fork-per-file), which
// reliably survives.

let webgpuRenderer;
//Keep the Dawn instance referenced for the whole file - if it is garbage
//collected, the webgpu package's pending event processing segfaults.
let gpu;

beforeAll(async () => {
  Object.assign(globalThis, gpuGlobals);
  gpu = createGPU([]);
  const adapter = await gpu.requestAdapter();
  //Request the adapter's maximum storage buffers per stage, matching
  //src/renderer.js. The compute pass itself only binds two.
  const device = await adapter.requestDevice({
    requiredLimits: {
      maxStorageBuffersPerShaderStage: adapter.limits.maxStorageBuffersPerShaderStage,
    },
  });
  webgpuRenderer = new THREE.WebGPURenderer({ device });
  await webgpuRenderer.init();
});

describe('glyph transform compute (NONE)', () => {
  it('binds only two storage buffers, within every device limit', () => {
    const n = 2;
    const data = new Float32Array(n * 3 * 2).fill(1);
    //Colours included, the case which used to need 11 storage buffers
    const glyphCompute = createGlyphTransformCompute({
      baseCount: n,
      outputCount: n,
      repeat_mode: 'NONE',
      positionsData: data,
      axis1Data: data,
      axis2Data: data,
      axis3Data: data,
      scaleData: data,
      colorData: data,
      baseSize: [1, 1, 1],
      offset: [0, 0, 0],
      scaleFactors: [1, 1, 1],
      globalScale: 1,
    });
    //Build the shader only, no dispatch
    const shader = webgpuRenderer._nodes.getForCompute(glyphCompute.compute).computeShader;
    expect((shader.match(/var<storage/g) || []).length).toBe(2);
  });

  it('matches the CPU resolve_glyph_axes reference for a blended frame', async () => {
    await runRepeatModeCheck(
      webgpuRenderer,
      'NONE',
      createGlyphTransformCompute,
      dispatchAndReadbackGlyphTransform,
      expect,
    );
  });
});
