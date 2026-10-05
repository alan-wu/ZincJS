import * as THREE from 'three/webgpu';
import {
  Fn,
  If,
  attributeArray,
  instanceIndex,
  int,
  float,
  vec3,
  vec4,
  uniform,
  mix,
  select,
  max,
} from 'three/tsl';

/**
 * Mirrors the string repeat_mode values used throughout glyphset.js as small
 * integers, since TSL uniforms/comparisons work with numeric types.
 */
const REPEAT_MODE = { NONE: 0, MIRROR: 1, AXES_2D: 2, AXES_3D: 3 };

const repeatModeToInt = (repeat_mode) => {
  switch (repeat_mode) {
    case "MIRROR": return REPEAT_MODE.MIRROR;
    case "AXES_2D": return REPEAT_MODE.AXES_2D;
    case "AXES_3D": return REPEAT_MODE.AXES_3D;
    default: return REPEAT_MODE.NONE;
  }
}

//Order of the vec4 fields of each glyph instance in the output buffer
const OUTPUT_FIELDS = { position: 0, axis1: 1, axis2: 2, axis3: 3, color: 4 };

const multiplierForRepeatMode = (repeat_mode) => {
  if (repeat_mode == "AXES_2D" || repeat_mode == "MIRROR") return 2;
  if (repeat_mode == "AXES_3D") return 3;
  return 1;
}

/**
 * GPU port of Glyphset's resolve_glyph_axes() + the per-frame keyframe
 * interpolation from updateMorphGlyphsets(). This is only used for the
 * recurring, per-frame time-varying animation path - the one-time,
 * load-time glyph transform/colour computation still runs on the CPU (see
 * glyphset.js).
 *
 * baseSize/offset/scaleFactors/globalScale/repeat_mode are fixed for the
 * lifetime of a glyphset, so they're baked in as uniforms once here rather
 * than re-passed on every dispatch; bottomFrame/topFrame/proportion are the
 * only per-frame-changing uniforms (see uniforms.bottomFrame etc. on the
 * returned object).
 *
 * @param {Object} params
 * @param {number} params.baseCount - number of raw (pre-repeat_mode-expansion)
 *   glyph records per keyframe (positions.length/3 for a single frame).
 * @param {number} params.numberOfTimeSteps - number of keyframes.
 * @param {number} params.outputCount - final instance count after
 *   repeat_mode expansion (glyphset.js's numberOfVertices).
 * @param {string} params.repeat_mode - "NONE" | "MIRROR" | "AXES_2D" | "AXES_3D".
 * @param {Float32Array} params.positionsData - flattened [time][record][xyz].
 * @param {Float32Array} params.axis1Data
 * @param {Float32Array} params.axis2Data
 * @param {Float32Array} params.axis3Data
 * @param {Float32Array} params.scaleData
 * @param {Float32Array} [params.colorData] - flattened [time][record][rgb],
 *   omitted when the glyphset has no colours.
 * @param {Array<number>} params.baseSize
 * @param {Array<number>} params.offset
 * @param {Array<number>} params.scaleFactors
 * @returns {Object} { uniforms, compute, outputs } - update
 *   uniforms.bottomFrame/topFrame/proportion.value then pass `compute` to
 *   renderer.compute()/computeAsync(); read results back with
 *   readbackGlyphTransform(). outputs.buffer is the interleaved storage
 *   buffer (outputs.stride vec4 per instance), outputs.position/axis1/
 *   axis2/axis3/color provide element(index) accessors for materials.
 */
function createGlyphTransformCompute({
  baseCount,
  outputCount,
  repeat_mode,
  positionsData,
  axis1Data,
  axis2Data,
  axis3Data,
  scaleData,
  colorData,
  baseSize,
  offset,
  scaleFactors,
  globalScale,
}) {
  const multiplier = multiplierForRepeatMode(repeat_mode);

  // All inputs are interleaved into a single storage buffer and all outputs
  // into another, one vec4 per field. Separate buffers per field needed up
  // to 11 storage buffers in the compute stage, more than some devices
  // support (e.g. 10 on iOS). vec4 also avoids three.js padding vec3
  // storage data into an extra copy.
  const hasColor = !!colorData;
  const inputSources = [positionsData, axis1Data, axis2Data, axis3Data, scaleData];
  if (hasColor) inputSources.push(colorData);
  const inputStride = inputSources.length;
  const outputStride = hasColor ? OUTPUT_FIELDS.color + 1 : OUTPUT_FIELDS.axis3 + 1;
  const recordCount = positionsData.length / 3;
  const inputData = new Float32Array(recordCount * inputStride * 4);
  for (let record = 0; record < recordCount; record++) {
    for (let field = 0; field < inputStride; field++) {
      const source = inputSources[field];
      const target = (record * inputStride + field) * 4;
      inputData[target] = source[record * 3];
      inputData[target + 1] = source[record * 3 + 1];
      inputData[target + 2] = source[record * 3 + 2];
    }
  }
  const inputBuffer = attributeArray(inputData, 'vec4');
  const outputBuffer = attributeArray(outputCount * outputStride, 'vec4');

  const readInput = (recordIdx, field) =>
    inputBuffer.element(recordIdx.mul(int(inputStride)).add(int(field))).xyz;
  const writeOutput = (outIdx, field, value) =>
    outputBuffer.element(outIdx.mul(int(outputStride)).add(int(field))).assign(vec4(value, 0));
  //Accessor used by the render material to read an output field
  const outputField = (field) => ({
    element: (idx) => outputBuffer.element(int(idx).mul(int(outputStride)).add(int(field))).xyz,
  });

  const uniforms = {
    bottomFrame: uniform(0, 'int'),
    topFrame: uniform(0, 'int'),
    proportion: uniform(1),
    repeatMode: uniform(repeatModeToInt(repeat_mode), 'int'),
    baseSize: uniform(new THREE.Vector3(...baseSize)),
    offset: uniform(new THREE.Vector3(...offset)),
    scaleFactors: uniform(new THREE.Vector3(...scaleFactors)),
    globalScale: uniform(globalScale),
  };

  const computeFn = Fn(() => {

    const outIdx = int(instanceIndex);
    const inputIdx = outIdx.div(int(multiplier));
    const copyIdx = outIdx.mod(int(multiplier));

    const bottomIdx = uniforms.bottomFrame.mul(int(baseCount)).add(inputIdx);
    const topIdx = uniforms.topFrame.mul(int(baseCount)).add(inputIdx);

    // Matches updateMorphGlyphsets(): bottom*proportion + top*(1-proportion).
    const point = mix(readInput(topIdx, 0), readInput(bottomIdx, 0), uniforms.proportion);
    const axis1 = mix(readInput(topIdx, 1), readInput(bottomIdx, 1), uniforms.proportion);
    const axis2 = mix(readInput(topIdx, 2), readInput(bottomIdx, 2), uniforms.proportion);
    const axis3 = mix(readInput(topIdx, 3), readInput(bottomIdx, 3), uniforms.proportion);
    const scale = mix(readInput(topIdx, 4), readInput(bottomIdx, 4), uniforms.proportion);

    // NOTE: each branch below assigns straight into the output storage
    // buffer elements (outPosition.element(outIdx).assign(...) etc.),
    // rather than into a shared vec3(0).toVar() declared before the
    // If/Else and read back afterwards - that pattern (var declared
    // outside an If().Else(), written in both branches, read after)
    // reliably crashes this three.js version's WGSL codegen (verified via
    // a native crash bisected down to exactly that shape in
    // test/glyphTransformCompute.test.js's development). Writing directly
    // to the output buffer inside each branch avoids it.

    const isNoneOrMirror = uniforms.repeatMode.equal(int(REPEAT_MODE.NONE))
      .or(uniforms.repeatMode.equal(int(REPEAT_MODE.MIRROR)));

    If(isNoneOrMirror, () => {

      // resolve_glyph_axes(): NONE / MIRROR branch.
      const signVec = vec3(
        select(scale.x.lessThan(0), float(-1), float(1)),
        select(scale.y.lessThan(0), float(-1), float(1)),
        select(scale.z.lessThan(0), float(-1), float(1)),
      );
      const axisScale = signVec.mul(uniforms.baseSize).add(scale.mul(uniforms.scaleFactors)).mul(uniforms.globalScale);
      const baseAxis1 = axis1.mul(axisScale.x);
      const baseAxis2 = axis2.mul(axisScale.y);
      const baseAxis3 = axis3.mul(axisScale.z);
      const basePoint = point
        .add(baseAxis1.mul(uniforms.offset.x))
        .add(baseAxis2.mul(uniforms.offset.y))
        .add(baseAxis3.mul(uniforms.offset.z));

      const isMirrorCopy = uniforms.repeatMode.equal(int(REPEAT_MODE.MIRROR)).and(copyIdx.equal(int(1)));

      const a1 = select(isMirrorCopy, baseAxis1.negate(), baseAxis1).toVar();
      const a2 = select(isMirrorCopy, baseAxis2.negate(), baseAxis2).toVar();
      const a3 = select(isMirrorCopy, baseAxis3.negate(), baseAxis3).toVar();
      const p = basePoint.toVar();

      If(uniforms.repeatMode.equal(int(REPEAT_MODE.MIRROR)).and(scale.x.lessThan(0)), () => {
        // shift glyph origin to end of axis1
        p.subAssign(a1);
      });

      // reverse axis3 if required to maintain a right-handed coordinate system
      const triple = a3.dot(a1.cross(a2));
      If(triple.lessThan(0), () => {
        a3.assign(a3.negate());
      });

      writeOutput(outIdx, OUTPUT_FIELDS.position, p);
      writeOutput(outIdx, OUTPUT_FIELDS.axis1, a1);
      writeOutput(outIdx, OUTPUT_FIELDS.axis2, a2);
      writeOutput(outIdx, OUTPUT_FIELDS.axis3, a3);

    }).Else(() => {

      // resolve_glyph_axes(): AXES_2D / AXES_3D branch.
      const signVec = vec3(
        select(scale.x.lessThan(0), float(-1), float(1)),
        select(scale.y.lessThan(0), float(-1), float(1)),
        select(scale.z.lessThan(0), float(-1), float(1)),
      );
      const axisScale = signVec.mul(uniforms.baseSize.x).add(scale.mul(uniforms.scaleFactors.x)).mul(uniforms.globalScale);
      const finalPoint = point
        .add(axis1.mul(axisScale.x).mul(uniforms.offset.x))
        .add(axis2.mul(axisScale.y).mul(uniforms.offset.y))
        .add(axis3.mul(axisScale.z).mul(uniforms.offset.z));

      const useScale = select(copyIdx.equal(int(0)), scale.x,
        select(copyIdx.equal(int(1)), scale.y, scale.z));

      const isAxes2D = uniforms.repeatMode.equal(int(REPEAT_MODE.AXES_2D));

      const useAxis1 = select(copyIdx.equal(int(0)), axis1,
        select(copyIdx.equal(int(1)), axis2, axis3));
      const useAxis2 = select(copyIdx.equal(int(0)), axis2,
        select(copyIdx.equal(int(1)), select(isAxes2D, axis1, axis3), axis1));

      const finalScale1 = uniforms.baseSize.x.add(useScale.mul(uniforms.scaleFactors.x)).mul(uniforms.globalScale);
      const finalAxis1 = useAxis1.mul(finalScale1);

      const axis3Raw = finalAxis1.cross(useAxis2);
      const mag1 = axis3Raw.length();
      let scaling1 = uniforms.baseSize.z.add(useScale.mul(uniforms.scaleFactors.z)).mul(uniforms.globalScale)
        .div(max(mag1, 1e-8));
      scaling1 = select(isAxes2D.and(copyIdx.greaterThan(int(0))), scaling1.mul(-1), scaling1);
      const finalAxis3 = select(mag1.greaterThan(0), axis3Raw.mul(scaling1), axis3Raw);

      const axis2Raw = finalAxis3.cross(finalAxis1);
      const mag2 = axis2Raw.length();
      const scaling2 = uniforms.baseSize.y.add(useScale.mul(uniforms.scaleFactors.y)).mul(uniforms.globalScale)
        .div(max(mag2, 1e-8));
      const finalAxis2 = select(mag2.greaterThan(0), axis2Raw.mul(scaling2), axis2Raw);

      writeOutput(outIdx, OUTPUT_FIELDS.position, finalPoint);
      writeOutput(outIdx, OUTPUT_FIELDS.axis1, finalAxis1);
      writeOutput(outIdx, OUTPUT_FIELDS.axis2, finalAxis2);
      writeOutput(outIdx, OUTPUT_FIELDS.axis3, finalAxis3);

    });

    if (hasColor) {
      const color = mix(readInput(topIdx, 5), readInput(bottomIdx, 5), uniforms.proportion);
      writeOutput(outIdx, OUTPUT_FIELDS.color, color);
    }

  } )().compute( outputCount );

  return {
    uniforms,
    compute: computeFn,
    outputs: {
      buffer: outputBuffer,
      stride: outputStride,
      count: outputCount,
      position: outputField(OUTPUT_FIELDS.position),
      axis1: outputField(OUTPUT_FIELDS.axis1),
      axis2: outputField(OUTPUT_FIELDS.axis2),
      axis3: outputField(OUTPUT_FIELDS.axis3),
      color: hasColor ? outputField(OUTPUT_FIELDS.color) : undefined,
    },
  };
}

/**
 * Reads a glyph-transform compute pass's output buffers back to the CPU,
 * without dispatching a new renderer.compute() call first - i.e. assumes
 * the buffers already hold the desired result from a previous compute()
 * dispatch (see dispatchAndReadbackGlyphTransform, or a bare
 * renderer.compute(glyphCompute.compute) call). Split out from
 * dispatchAndReadbackGlyphTransform so a caller that already dispatched
 * recently (e.g. Glyphset's debounced accurate resync, which reuses the
 * buffers its own immediately-preceding fast/no-readback dispatch just
 * wrote) doesn't have to pay for - or risk - a second, redundant
 * renderer.compute() call right on top of the first: back-to-back compute
 * dispatches in close succession have been observed to reliably crash the
 * (Node-only, test-time) WebGPU native backend.
 *
 * @param {THREE.WebGPURenderer} renderer
 * @param {Object} glyphCompute - return value of createGlyphTransformCompute().
 * @returns {Promise<Object>} { position, axis1, axis2, axis3, color } -
 *   plain Float32Arrays with a 4 float stride per output glyph instance
 *   (color only present when the glyphset has colours).
 */
async function readbackGlyphTransform(renderer, glyphCompute) {
  const { buffer, stride, count, color } = glyphCompute.outputs;
  //A single readback of the interleaved output buffer
  const data = new Float32Array(await renderer.getArrayBufferAsync(buffer.value));
  //Split into one array per field, each with a 4 float stride per instance
  const extract = (field) => {
    const result = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const source = (i * stride + field) * 4;
      result[i * 4] = data[source];
      result[i * 4 + 1] = data[source + 1];
      result[i * 4 + 2] = data[source + 2];
    }
    return result;
  };
  return {
    position: extract(OUTPUT_FIELDS.position),
    axis1: extract(OUTPUT_FIELDS.axis1),
    axis2: extract(OUTPUT_FIELDS.axis2),
    axis3: extract(OUTPUT_FIELDS.axis3),
    color: color ? extract(OUTPUT_FIELDS.color) : undefined,
  };
}

/**
 * Dispatches a glyph-transform compute pass built by
 * createGlyphTransformCompute() and reads its output buffers back to the
 * CPU. Update `glyphCompute.uniforms.bottomFrame/topFrame/proportion(/
 * globalScale).value` before calling this.
 *
 * @param {THREE.WebGPURenderer} renderer
 * @param {Object} glyphCompute - return value of createGlyphTransformCompute().
 * @returns {Promise<Object>} see readbackGlyphTransform().
 */
async function dispatchAndReadbackGlyphTransform(renderer, glyphCompute) {
  renderer.compute(glyphCompute.compute);
  return readbackGlyphTransform(renderer, glyphCompute);
}

export { createGlyphTransformCompute, dispatchAndReadbackGlyphTransform, readbackGlyphTransform, REPEAT_MODE };
