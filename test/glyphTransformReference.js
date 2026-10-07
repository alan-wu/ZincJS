import * as THREE from 'three/webgpu';

// Shared fixtures/reference implementation for the glyphTransformCompute.*
// test files (test/glyphTransformCompute.NONE.test.js etc). Split into one
// file per repeat_mode, each running in its own vitest worker process
// (fork-per-test-file), because the test-only Node WebGPU backend has been
// observed to crash natively ("futex facility returned an unexpected error
// code") after a handful of GPU round trips run back to back within one
// process - regardless of whether those round trips are separate it()
// blocks, a describe.each, or a plain loop inside one test. Isolating each
// mode to its own file/process is the only structure that reliably survives
// this backend's threading bug.

export const BASE_SIZE = [0.1, 0.2, 0.3];
export const OFFSET = [0, -0.5, 0];
export const SCALE_FACTORS = [1, 1, 1];
export const GLOBAL_SCALE = 1.25;

//Direct JS port of glyphset.js's resolve_glyph_axes(), used only as an
//independent reference to check the TSL compute shader against - kept
//deliberately close to the original so it's easy to eyeball-diff the two.
export function referenceResolveGlyphAxes(point, axis1, axis2, axis3, scale, repeat_mode) {
  const return_arrays = [];
  if (repeat_mode == "NONE" || repeat_mode == "MIRROR") {
    const axis_scale = [0, 0, 0];
    const final_axis1 = [0, 0, 0], final_axis2 = [0, 0, 0], final_axis3 = [0, 0, 0], final_point = [0, 0, 0];
    const mirrored_axis1 = [0, 0, 0], mirrored_axis2 = [0, 0, 0], mirrored_axis3 = [0, 0, 0], mirrored_point = [0, 0, 0];
    for (let j = 0; j < 3; j++) {
      const sign = (scale[j] < 0.0) ? -1.0 : 1.0;
      axis_scale[j] = (sign * BASE_SIZE[j] + scale[j] * SCALE_FACTORS[j]) * GLOBAL_SCALE;
    }
    for (let j = 0; j < 3; j++) {
      final_axis1[j] = axis1[j] * axis_scale[0];
      final_axis2[j] = axis2[j] * axis_scale[1];
      final_axis3[j] = axis3[j] * axis_scale[2];
      final_point[j] = point[j] + OFFSET[0] * final_axis1[j] + OFFSET[1] * final_axis2[j] + OFFSET[2] * final_axis3[j];
      if (repeat_mode == "MIRROR") {
        mirrored_axis1[j] = -final_axis1[j];
        mirrored_axis2[j] = -final_axis2[j];
        mirrored_axis3[j] = -final_axis3[j];
        mirrored_point[j] = final_point[j];
        if (scale[0] < 0.0) {
          final_point[j] -= final_axis1[j];
          mirrored_point[j] -= mirrored_axis1[j];
        }
      }
    }
    if (0.0 > (final_axis3[0] * (final_axis1[1] * final_axis2[2] - final_axis1[2] * final_axis2[1]) +
      final_axis3[1] * (final_axis1[2] * final_axis2[0] - final_axis1[0] * final_axis2[2]) +
      final_axis3[2] * (final_axis1[0] * final_axis2[1] - final_axis1[1] * final_axis2[0]))) {
      final_axis3[0] = -final_axis3[0]; final_axis3[1] = -final_axis3[1]; final_axis3[2] = -final_axis3[2];
    }
    return_arrays[0] = [final_point, final_axis1, final_axis2, final_axis3];
    if (repeat_mode == "MIRROR") {
      if (0.0 > (mirrored_axis3[0] * (mirrored_axis1[1] * mirrored_axis2[2] - mirrored_axis1[2] * mirrored_axis2[1]) +
        mirrored_axis3[1] * (mirrored_axis1[2] * mirrored_axis2[0] - mirrored_axis1[0] * mirrored_axis2[2]) +
        mirrored_axis3[2] * (mirrored_axis1[0] * mirrored_axis2[1] - mirrored_axis1[1] * mirrored_axis2[0]))) {
        mirrored_axis3[0] = -mirrored_axis3[0]; mirrored_axis3[1] = -mirrored_axis3[1]; mirrored_axis3[2] = -mirrored_axis3[2];
      }
      return_arrays[1] = [mirrored_point, mirrored_axis1, mirrored_axis2, mirrored_axis3];
    }
  } else if (repeat_mode == "AXES_2D" || repeat_mode == "AXES_3D") {
    const axis_scale = [0, 0, 0];
    const final_point = [0, 0, 0];
    for (let j = 0; j < 3; j++) {
      const sign = (scale[j] < 0.0) ? -1.0 : 1.0;
      axis_scale[j] = (sign * BASE_SIZE[0] + scale[j] * SCALE_FACTORS[0]) * GLOBAL_SCALE;
    }
    for (let j = 0; j < 3; j++) {
      final_point[j] = point[j] + OFFSET[0] * axis_scale[0] * axis1[j] + OFFSET[1] * axis_scale[1] * axis2[j] + OFFSET[2] * axis_scale[2] * axis3[j];
    }
    const number_of_glyphs = (repeat_mode == "AXES_2D") ? 2 : 3;
    for (let k = 0; k < number_of_glyphs; k++) {
      let use_axis1, use_axis2;
      const use_scale = scale[k];
      const final_axis1 = [0, 0, 0], final_axis2 = [0, 0, 0], final_axis3 = [0, 0, 0];
      if (k == 0) { use_axis1 = axis1; use_axis2 = axis2; }
      else if (k == 1) { use_axis1 = axis2; use_axis2 = (repeat_mode == "AXES_2D") ? axis1 : axis3; }
      else { use_axis1 = axis3; use_axis2 = axis1; }
      const final_scale1 = (BASE_SIZE[0] + use_scale * SCALE_FACTORS[0]) * GLOBAL_SCALE;
      final_axis1[0] = use_axis1[0] * final_scale1; final_axis1[1] = use_axis1[1] * final_scale1; final_axis1[2] = use_axis1[2] * final_scale1;
      final_axis3[0] = final_axis1[1] * use_axis2[2] - use_axis2[1] * final_axis1[2];
      final_axis3[1] = final_axis1[2] * use_axis2[0] - use_axis2[2] * final_axis1[0];
      final_axis3[2] = final_axis1[0] * use_axis2[1] - final_axis1[1] * use_axis2[0];
      let magnitude = Math.sqrt(final_axis3[0] ** 2 + final_axis3[1] ** 2 + final_axis3[2] ** 2);
      if (0.0 < magnitude) {
        let scaling = (BASE_SIZE[2] + use_scale * SCALE_FACTORS[2]) * GLOBAL_SCALE / magnitude;
        if ((repeat_mode == "AXES_2D") && (k > 0)) scaling *= -1.0;
        final_axis3[0] *= scaling; final_axis3[1] *= scaling; final_axis3[2] *= scaling;
      }
      final_axis2[0] = final_axis3[1] * final_axis1[2] - final_axis1[1] * final_axis3[2];
      final_axis2[1] = final_axis3[2] * final_axis1[0] - final_axis1[2] * final_axis3[0];
      final_axis2[2] = final_axis3[0] * final_axis1[1] - final_axis3[1] * final_axis1[0];
      magnitude = Math.sqrt(final_axis2[0] ** 2 + final_axis2[1] ** 2 + final_axis2[2] ** 2);
      if (0.0 < magnitude) {
        const scaling = (BASE_SIZE[1] + use_scale * SCALE_FACTORS[1]) * GLOBAL_SCALE / magnitude;
        final_axis2[0] *= scaling; final_axis2[1] *= scaling; final_axis2[2] *= scaling;
      }
      return_arrays[k] = [final_point, final_axis1, final_axis2, final_axis3];
    }
  }
  return return_arrays;
}

//Two synthetic keyframes, 2 base glyph records each (baseCount=2), with a
//non-trivial (non-axis-aligned) orientation and negative-scale components
//so both the handedness-fix and origin-shift branches actually get
//exercised.
export const FRAME0 = {
  point: [[0, 0, 0], [1, 2, 3]],
  axis1: [[1, 0, 0], [0.6, 0.8, 0]],
  axis2: [[0, 1, 0], [-0.8, 0.6, 0]],
  axis3: [[0, 0, -1], [0, 0, 1]], // left-handed on record 0 - exercises the handedness fix
  scale: [[1, 1, 1], [-1, 2, 0.5]], // negative scale.x on record 1 - exercises MIRROR's origin shift
};
export const FRAME1 = {
  point: [[5, 0, 0], [4, -1, 2]],
  axis1: [[0, 1, 0], [1, 0, 0]],
  axis2: [[-1, 0, 0], [0, 0, 1]],
  axis3: [[0, 0, 1], [0, -1, 0]],
  scale: [[2, 1, 1], [1, -1, 1]],
};
export const COLOR0 = [0xff0000, 0x00ff00];
export const COLOR1 = [0x0000ff, 0xffff00];

function flattenVec3([a, b]) {
  return new Float32Array([...a, ...b]);
}

export function buildFrameData() {
  const baseCount = 2;
  const steps = 2;
  const flatten = (key) => {
    const out = new Float32Array(steps * baseCount * 3);
    out.set(flattenVec3(FRAME0[key]), 0);
    out.set(flattenVec3(FRAME1[key]), baseCount * 3);
    return out;
  };
  const flattenColor = (frame) => {
    const out = new Float32Array(baseCount * 3);
    const c = new THREE.Color();
    for (let i = 0; i < baseCount; i++) {
      c.setHex(frame[i]);
      out[i * 3] = c.r; out[i * 3 + 1] = c.g; out[i * 3 + 2] = c.b;
    }
    return out;
  };
  const colorData = new Float32Array(steps * baseCount * 3);
  colorData.set(flattenColor(COLOR0), 0);
  colorData.set(flattenColor(COLOR1), baseCount * 3);

  return {
    baseCount,
    positionsData: flatten('point'),
    axis1Data: flatten('axis1'),
    axis2Data: flatten('axis2'),
    axis3Data: flatten('axis3'),
    scaleData: flatten('scale'),
    colorData,
  };
}

function lerp(a, b, proportion) {
  return a.map((v, i) => proportion * v + (1 - proportion) * b[i]);
}

export function referenceForRecord(recordIndex, repeat_mode, proportion) {
  const point = lerp(FRAME0.point[recordIndex], FRAME1.point[recordIndex], proportion);
  const axis1 = lerp(FRAME0.axis1[recordIndex], FRAME1.axis1[recordIndex], proportion);
  const axis2 = lerp(FRAME0.axis2[recordIndex], FRAME1.axis2[recordIndex], proportion);
  const axis3 = lerp(FRAME0.axis3[recordIndex], FRAME1.axis3[recordIndex], proportion);
  const scale = lerp(FRAME0.scale[recordIndex], FRAME1.scale[recordIndex], proportion);
  return referenceResolveGlyphAxes(point, axis1, axis2, axis3, scale, repeat_mode);
}

export function multiplierFor(repeat_mode) {
  if (repeat_mode == "AXES_2D" || repeat_mode == "MIRROR") return 2;
  if (repeat_mode == "AXES_3D") return 3;
  return 1;
}

export async function runRepeatModeCheck(webgpuRenderer, repeat_mode, createGlyphTransformCompute, dispatchAndReadbackGlyphTransform, expect) {
  const { baseCount, positionsData, axis1Data, axis2Data, axis3Data, scaleData, colorData } = buildFrameData();
  const multiplier = multiplierFor(repeat_mode);
  const outputCount = baseCount * multiplier;

  const glyphCompute = createGlyphTransformCompute({
    baseCount,
    outputCount,
    repeat_mode,
    positionsData,
    axis1Data,
    axis2Data,
    axis3Data,
    scaleData,
    colorData,
    baseSize: BASE_SIZE,
    offset: OFFSET,
    scaleFactors: SCALE_FACTORS,
    globalScale: GLOBAL_SCALE,
  });

  const proportion = 0.35;
  glyphCompute.uniforms.bottomFrame.value = 0;
  glyphCompute.uniforms.topFrame.value = 1;
  glyphCompute.uniforms.proportion.value = proportion;

  const result = await dispatchAndReadbackGlyphTransform(webgpuRenderer, glyphCompute);

  // vec3 storage buffer elements are read back padded to a 4-float
  // (16-byte) stride (std430-style alignment) even though itemSize is
  // logically 3 - confirmed empirically against this three.js version.
  let outIdx = 0;
  for (let record = 0; record < baseCount; record++) {
    const expectedTuples = referenceForRecord(record, repeat_mode, proportion);
    expect(expectedTuples.length).toBe(multiplier);
    for (let copy = 0; copy < multiplier; copy++) {
      const [expPoint, expAxis1, expAxis2, expAxis3] = expectedTuples[copy];
      const o = outIdx * 4;
      expect(result.position[o]).toBeCloseTo(expPoint[0], 4);
      expect(result.position[o + 1]).toBeCloseTo(expPoint[1], 4);
      expect(result.position[o + 2]).toBeCloseTo(expPoint[2], 4);
      expect(result.axis1[o]).toBeCloseTo(expAxis1[0], 4);
      expect(result.axis1[o + 1]).toBeCloseTo(expAxis1[1], 4);
      expect(result.axis1[o + 2]).toBeCloseTo(expAxis1[2], 4);
      expect(result.axis2[o]).toBeCloseTo(expAxis2[0], 4);
      expect(result.axis2[o + 1]).toBeCloseTo(expAxis2[1], 4);
      expect(result.axis2[o + 2]).toBeCloseTo(expAxis2[2], 4);
      expect(result.axis3[o]).toBeCloseTo(expAxis3[0], 4);
      expect(result.axis3[o + 1]).toBeCloseTo(expAxis3[1], 4);
      expect(result.axis3[o + 2]).toBeCloseTo(expAxis3[2], 4);
      outIdx++;
    }
  }

  // Colour: mix(top, bottom, proportion) per component, same blend rule
  // as updateMorphGlyphsets()'s RGB lerp.
  const cA = new THREE.Color(COLOR0[0]);
  const cB = new THREE.Color(COLOR1[0]);
  const expR = proportion * cA.r + (1 - proportion) * cB.r;
  expect(result.color[0]).toBeCloseTo(expR, 4);
}
