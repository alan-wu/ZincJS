import * as THREE from 'three/webgpu';
import { it, expect, afterEach } from 'vitest';
import { Glyphset } from '../src/primitives/glyphset';
import { setGlyphComputeSupported } from '../src/tsl/glyphTransform';
import glyphsetData from './models/timeGlyphs_metadata.json';
import glyphGeometry from './models/timeGlyphs_geometry.json';

// The WebGL fallback backend of WebGPURenderer cannot run the GPU glyph
// transforms, the renderer then turns them off and glyphsets with morphing
// vertices must animate on the CPU instead.

afterEach(() => {
  setGlyphComputeSupported(true);
});

const lerp3 = (a, b, proportion) =>
  [0, 1, 2].map((j) => proportion * a[j] + (1 - proportion) * b[j]);

// resolve_glyph_axes()'s NONE branch for this fixture (repeat_mode "NONE")
const expectedPoint = (record, bottomFrame, topFrame, proportion) => {
  const { positions, axis1, axis2, axis3, scale } = glyphsetData;
  const { base_size: baseSize, offset, scale_factors: scaleFactors } = glyphsetData.metadata;
  const o = record * 3;
  const pick = (obj, frame) => obj[frame.toString()].slice(o, o + 3);
  const point = lerp3(pick(positions, bottomFrame), pick(positions, topFrame), proportion);
  const a1 = lerp3(pick(axis1, bottomFrame), pick(axis1, topFrame), proportion);
  const a2 = lerp3(pick(axis2, bottomFrame), pick(axis2, topFrame), proportion);
  const a3 = lerp3(pick(axis3, bottomFrame), pick(axis3, topFrame), proportion);
  const sc = lerp3(pick(scale, bottomFrame), pick(scale, topFrame), proportion);
  const axisScale = [0, 1, 2].map(
    (j) => (sc[j] < 0 ? -1 : 1) * baseSize[j] + sc[j] * scaleFactors[j],
  );
  return [0, 1, 2].map(
    (j) =>
      point[j] +
      offset[0] * a1[j] * axisScale[0] +
      offset[1] * a2[j] * axisScale[1] +
      offset[2] * a3[j] * axisScale[2],
  );
};

const loadGlyphset = () => {
  const glyphset = new Glyphset();
  glyphset.load(glyphsetData, glyphGeometry, () => {}, true, false);
  return glyphset;
};

it('uses the GPU compute path when it is supported', () => {
  expect(loadGlyphset().isUsingGPUCompute()).toBe(true);
});

it('animates morphing glyphs on the CPU when GPU compute is not supported', () => {
  setGlyphComputeSupported(false);
  const glyphset = loadGlyphset();
  expect(glyphset.isUsingGPUCompute()).toBe(false);

  const bottomFrame = 1;
  const topFrame = 2;
  const proportion = 0.5;
  const numberOfTimeSteps = glyphsetData.metadata.number_of_time_steps;
  glyphset.duration = 1;
  //The CPU path updates instanceMatrix synchronously
  glyphset.setMorphTime((bottomFrame + (1 - proportion)) / (numberOfTimeSteps - 1));

  const transformMatrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  for (let record = 0; record < glyphsetData.metadata.number_of_vertices; record++) {
    const expected = expectedPoint(record, bottomFrame, topFrame, proportion);
    glyphset.morph.getMatrixAt(record, transformMatrix);
    position.setFromMatrixPosition(transformMatrix);
    expect(position.x, `record ${record} x`).toBeCloseTo(expected[0], 4);
    expect(position.y, `record ${record} y`).toBeCloseTo(expected[1], 4);
    expect(position.z, `record ${record} z`).toBeCloseTo(expected[2], 4);
  }
});
