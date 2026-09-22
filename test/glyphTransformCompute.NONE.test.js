import * as THREE from 'three/webgpu';
import { describe, it, expect, beforeAll } from 'vitest';
import { create as createGPU, globals as gpuGlobals } from 'webgpu';
import { createGlyphTransformCompute, dispatchAndReadbackGlyphTransform } from '../src/tsl/glyphTransform';
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

beforeAll(async () => {
  Object.assign(globalThis, gpuGlobals);
  const gpu = createGPU([]);
  const adapter = await gpu.requestAdapter();
  //This compute pass binds 11 storage buffers, above the default
  //maxStorageBuffersPerShaderStage (8) - request the adapter's actual max,
  //matching the fix in src/renderer.js.
  const device = await adapter.requestDevice({
    requiredLimits: { maxStorageBuffersPerShaderStage: adapter.limits.maxStorageBuffersPerShaderStage },
  });
  webgpuRenderer = new THREE.WebGPURenderer({ device });
  await webgpuRenderer.init();
});

describe('glyph transform compute (NONE)', () => {
  it('matches the CPU resolve_glyph_axes reference for a blended frame', async () => {
    await runRepeatModeCheck(webgpuRenderer, "NONE", createGlyphTransformCompute, dispatchAndReadbackGlyphTransform, expect);
  });
});
