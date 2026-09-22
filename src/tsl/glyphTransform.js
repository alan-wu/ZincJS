import * as THREE from 'three/webgpu';
import {
  Fn,
  If,
  attributeArray,
  instanceIndex,
  int,
  float,
  vec3,
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
 *   renderer.compute()/computeAsync(); read results back from
 *   outputs.position/axis1/axis2/axis3/color (each a StorageBufferNode -
 *   the raw attribute to read back is `outputs.position.value` etc).
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

  const positionsBuffer = attributeArray(positionsData, 'vec3');
  const axis1Buffer = attributeArray(axis1Data, 'vec3');
  const axis2Buffer = attributeArray(axis2Data, 'vec3');
  const axis3Buffer = attributeArray(axis3Data, 'vec3');
  const scaleBuffer = attributeArray(scaleData, 'vec3');
  const colorBuffer = colorData ? attributeArray(colorData, 'vec3') : undefined;

  const outPosition = attributeArray(outputCount, 'vec3');
  const outAxis1 = attributeArray(outputCount, 'vec3');
  const outAxis2 = attributeArray(outputCount, 'vec3');
  const outAxis3 = attributeArray(outputCount, 'vec3');
  const outColor = colorData ? attributeArray(outputCount, 'vec3') : undefined;

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
    const point = mix(positionsBuffer.element(topIdx), positionsBuffer.element(bottomIdx), uniforms.proportion);
    const axis1 = mix(axis1Buffer.element(topIdx), axis1Buffer.element(bottomIdx), uniforms.proportion);
    const axis2 = mix(axis2Buffer.element(topIdx), axis2Buffer.element(bottomIdx), uniforms.proportion);
    const axis3 = mix(axis3Buffer.element(topIdx), axis3Buffer.element(bottomIdx), uniforms.proportion);
    const scale = mix(scaleBuffer.element(topIdx), scaleBuffer.element(bottomIdx), uniforms.proportion);

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

      outPosition.element(outIdx).assign(p);
      outAxis1.element(outIdx).assign(a1);
      outAxis2.element(outIdx).assign(a2);
      outAxis3.element(outIdx).assign(a3);

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

      outPosition.element(outIdx).assign(finalPoint);
      outAxis1.element(outIdx).assign(finalAxis1);
      outAxis2.element(outIdx).assign(finalAxis2);
      outAxis3.element(outIdx).assign(finalAxis3);

    });

    if (colorBuffer) {
      const color = mix(colorBuffer.element(topIdx), colorBuffer.element(bottomIdx), uniforms.proportion);
      outColor.element(outIdx).assign(color);
    }

  } )().compute( outputCount );

  return {
    uniforms,
    compute: computeFn,
    outputs: {
      position: outPosition,
      axis1: outAxis1,
      axis2: outAxis2,
      axis3: outAxis3,
      color: outColor,
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
 *   plain Float32Arrays, one vec3 per output glyph instance (color only
 *   present when the glyphset has colours).
 */
async function readbackGlyphTransform(renderer, glyphCompute) {
  const { position, axis1, axis2, axis3, color } = glyphCompute.outputs;
  // Read sequentially rather than Promise.all-ing these - concurrent
  // getArrayBufferAsync() calls against the same device have been observed
  // to crash the (Node-only, test-time) WebGPU native backend; one at a
  // time is the safe pattern here.
  const positionResult = new Float32Array(await renderer.getArrayBufferAsync(position.value));
  const axis1Result = new Float32Array(await renderer.getArrayBufferAsync(axis1.value));
  const axis2Result = new Float32Array(await renderer.getArrayBufferAsync(axis2.value));
  const axis3Result = new Float32Array(await renderer.getArrayBufferAsync(axis3.value));
  const colorResult = color ? new Float32Array(await renderer.getArrayBufferAsync(color.value)) : undefined;

  return {
    position: positionResult,
    axis1: axis1Result,
    axis2: axis2Result,
    axis3: axis3Result,
    color: colorResult,
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
