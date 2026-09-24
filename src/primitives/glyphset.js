import * as THREE from 'three/webgpu';
import { Glyph } from './glyph';
import { ZincObject } from './zincObject';
import { JSONLoader } from '../loaders/JSONLoader';
import { createGlyphTransformCompute, dispatchAndReadbackGlyphTransform, readbackGlyphTransform } from '../tsl/glyphTransform';
import { createGlyphInstancedMaterial } from '../tsl/glyphRenderMaterial';

/**
 * This is a container of {@link Glyph} and their graphical properties
 * including transformations, colors, number of time steps, duration of animations
 * and group name. Please note that all glyphs in the glyphset share the same geometry
 * however they may have different transformations.
 *
 * @class
 * @author Alan Wu
 * @return {Glyphset}
 */
const Glyphset = function () {
  ZincObject.call(this);
  const glyphList = [];
  let axis1s = undefined;
  let axis2s = undefined;
  let axis3s = undefined;
  let positions = undefined;
  //Glyph geometry loaded after dispose is discarded
  let disposed = false;
  let scales = undefined;
  let colors = undefined;
  let labels = undefined;
  let numberOfTimeSteps = 0;
  let numberOfVertices = 0;
  let baseSize = [0, 0, 0];
  let offset = [0, 0, 0];
  let labelsOn = false;
  let scaleFactors = [0, 0, 0];
  let repeat_mode = "NONE";
  this.ready = false;
  let morphColours = false;
  let morphVertices = false;
  this.isGlyphset = true;
  let _transformMatrix = new THREE.Matrix4();
  const _bot_colour = new THREE.Color();
  const _top_colour = new THREE.Color();
  const _boundingBox1 = new THREE.Box3();
  const _boundingBox2 = new THREE.Box3();
  const _boundingBox3 = new THREE.Box3();
  const _points = [];
  const _current_positions = [];
  const _current_axis1s = [];
  const _current_axis2s = [];
  const _current_axis3s = [];
  const _current_scales = [];
  const _current_colors = [];
  const _glyph_axis_array = [];
  this.globalScale = 1;
  let glyphCompute = undefined;
  let glyphComputePending = false;
  // True once a full resync (dispatchGlyphCompute) has completed and nothing
  // has invalidated it since; false during active playback and while a resync
  // is in flight.
  let boundsAreExact = true;
  let renderBuffersInitialized = false;
  let wasAnimating = false;
  // Conservative bounding box unioned across every keyframe's exact
  let allFramesBoundingBox = undefined;
  // Debounces the accurate GPU->CPU readback (dispatchGlyphCompute) behind
  // setMorphTime() - e.g. a downstream slider firing many calls per second
  // while being dragged. The fast, readback-free GPU-only update still
  // happens on every call (see updateMorphGlyphsets), so visuals stay live;
  // Only the costlier readback (bounding box/raycast/export accuracy) waits
  // for ACCURATE_RESYNC_DEBOUNCE_MS of quiet.
  let accurateResyncTimer = undefined;
  const ACCURATE_RESYNC_DEBOUNCE_MS = 500;
  for (let i = 0; i < 8; i++) {
    _points[i] = new THREE.Vector3();
  }

  /**
   * Writes a resolve_glyph_axes() result tuple [point, axis1, axis2, axis3]
   * into a THREE.Matrix4's .elements, matching the column-major
   * axis1/axis2/axis3/point layout instanceMatrix expects.
   */
  const writeTransformMatrix = (matrix, arrayTuple) => {
    matrix.elements[0] = arrayTuple[1][0];
    matrix.elements[1] = arrayTuple[1][1];
    matrix.elements[2] = arrayTuple[1][2];
    matrix.elements[3] = 0.0;
    matrix.elements[4] = arrayTuple[2][0];
    matrix.elements[5] = arrayTuple[2][1];
    matrix.elements[6] = arrayTuple[2][2];
    matrix.elements[7] = 0.0;
    matrix.elements[8] = arrayTuple[3][0];
    matrix.elements[9] = arrayTuple[3][1];
    matrix.elements[10] = arrayTuple[3][2];
    matrix.elements[11] = 0.0;
    matrix.elements[12] = arrayTuple[0][0];
    matrix.elements[13] = arrayTuple[0][1];
    matrix.elements[14] = arrayTuple[0][2];
    matrix.elements[15] = 1.0;
  }

  /**
   * Flattens a { "0": [x,y,z,...], "1": [...], ... } per-keyframe object
   * (as used for axis1/axis2/axis3/positions/scale) into one contiguous
   * [time][record][xyz] buffer for the GPU compute path.
   */
  const flattenVec3Frames = (framesObj, steps, baseCount) => {
    const out = new Float32Array(steps * baseCount * 3);
    for (let t = 0; t < steps; t++) {
      const frame = framesObj[t.toString()];
      if (frame) {
        out.set(frame, t * baseCount * 3);
      }
    }
    return out;
  }

  /**
   * Same as flattenVec3Frames but for the colours object, whose per-frame
   * values are one packed hex int per glyph rather than 3 raw components -
   * decode each into RGB floats up front so the compute shader only ever
   * deals with plain vec3s.
   */
  const flattenColorFrames = (framesObj, steps, baseCount) => {
    const out = new Float32Array(steps * baseCount * 3);
    const tmpColor = new THREE.Color();
    for (let t = 0; t < steps; t++) {
      const frame = framesObj[t.toString()];
      if (frame) {
        for (let i = 0; i < baseCount; i++) {
          tmpColor.setHex(frame[i]);
          const o = (t * baseCount + i) * 3;
          out[o] = tmpColor.r;
          out[o + 1] = tmpColor.g;
          out[o + 2] = tmpColor.b;
        }
      }
    }
    return out;
  }

  /**
   * Copy glyphset data into this glyphset then load the glyph's geoemtry
   * with the provided glyphURL. FinishCallback will be called once
   * glyph is loaded.
   *
   * @param {Array} glyphsetData - contains the informations about the glyphs.
   * @param {String} glyphURL - URL to the geometry which will be applied to all
   * all the glyphs in the glyphset once loaded.
   * @param {Function} finishCallback - User's function to be called once glyph's
   * geometry is loaded.
   */
  this.load = (glyphsetData, glyphURL, finishCallback, isInline, displayLabels) => {
    disposed = false;
    axis1s = glyphsetData.axis1;
    axis2s = glyphsetData.axis2;
    axis3s = glyphsetData.axis3;
    positions = glyphsetData.positions;
    scales = glyphsetData.scale;
    colors = glyphsetData.colors;
    labels = glyphsetData.label;
    morphColours = glyphsetData.metadata.MorphColours;
    morphVertices = glyphsetData.metadata.MorphVertices;
    numberOfTimeSteps = glyphsetData.metadata.number_of_time_steps;
    repeat_mode = glyphsetData.metadata.repeat_mode;
    numberOfVertices = glyphsetData.metadata.number_of_vertices;
    if (repeat_mode == "AXES_2D" || repeat_mode == "MIRROR")
      numberOfVertices = numberOfVertices * 2;
    else if (repeat_mode == "AXES_3D")
      numberOfVertices = numberOfVertices * 3;
    baseSize = glyphsetData.metadata.base_size;
    offset = glyphsetData.metadata.offset;
    scaleFactors = glyphsetData.metadata.scale_factors;
    glyphCompute = undefined;
    if (morphVertices && numberOfTimeSteps > 1 && positions && positions["0"]) {
      const baseCount = positions["0"].length / 3;
      try {
        glyphCompute = createGlyphTransformCompute({
          baseCount,
          outputCount: numberOfVertices,
          repeat_mode,
          positionsData: flattenVec3Frames(positions, numberOfTimeSteps, baseCount),
          axis1Data: flattenVec3Frames(axis1s, numberOfTimeSteps, baseCount),
          axis2Data: flattenVec3Frames(axis2s, numberOfTimeSteps, baseCount),
          axis3Data: flattenVec3Frames(axis3s, numberOfTimeSteps, baseCount),
          scaleData: flattenVec3Frames(scales, numberOfTimeSteps, baseCount),
          colorData: (morphColours && colors) ? flattenColorFrames(colors, numberOfTimeSteps, baseCount) : undefined,
          baseSize,
          offset,
          scaleFactors,
          globalScale: this.globalScale,
        });
      } catch (err) {
        console.error("Failed to set up GPU glyph transform compute, falling back to CPU animation.", err);
        glyphCompute = undefined;
      }
    }
    const loader = new JSONLoader();
    this.geometry = new THREE.BufferGeometry();
    const instancedMesh = new THREE.InstancedMesh(this.geometry, undefined, numberOfVertices);
    this.setMorph(instancedMesh);
    if (isInline) {
      var object = loader.parse(glyphURL);
      (meshloader(finishCallback, displayLabels))(object.geometry, object.materials);
      object.geometry.dispose();
    } else {
      loader.crossOrigin = "Anonymous";
      loader.load(glyphURL, meshloader(finishCallback, displayLabels));
    }
  }

  /**
   * Calculate the actual transformation value that can be applied
   * to the transformation matrix.
   *
   * @returns {Array}
   */
  const resolve_glyph_axes = (point, axis1, axis2, axis3, scale, return_arrays) => {
    if (repeat_mode == "NONE" || repeat_mode == "MIRROR") {
      let axis_scale = [0.0, 0.0, 0.0];
      let final_axis1 = [0.0, 0.0, 0.0];
      let final_axis2 = [0.0, 0.0, 0.0];
      let final_axis3 = [0.0, 0.0, 0.0];
      let final_point = [0.0, 0.0, 0.0];
      const mirrored_axis1 = [0.0, 0.0, 0.0];
      const mirrored_axis2 = [0.0, 0.0, 0.0];
      const mirrored_axis3 = [0.0, 0.0, 0.0];
      const mirrored_point = [0.0, 0.0, 0.0];
      for (var j = 0; j < 3; j++) {
        var sign = (scale[j] < 0.0) ? -1.0 : 1.0;
        axis_scale[j] = (sign * baseSize[j] + scale[j] * scaleFactors[j]) * this.globalScale;
      }
      for (var j = 0; j < 3; j++) {
        final_axis1[j] = axis1[j] * axis_scale[0];
        final_axis2[j] = axis2[j] * axis_scale[1];
        final_axis3[j] = axis3[j] * axis_scale[2];
        final_point[j] = point[j]
          + offset[0] * final_axis1[j]
          + offset[1] * final_axis2[j]
          + offset[2] * final_axis3[j];
        if (repeat_mode == "MIRROR") {
          mirrored_axis1[j] = -final_axis1[j];
          mirrored_axis2[j] = -final_axis2[j];
          mirrored_axis3[j] = -final_axis3[j];
          mirrored_point[j] = final_point[j];
          if (scale[0] < 0.0) {
            // shift glyph origin to end of axis1
            final_point[j] -= final_axis1[j];
            mirrored_point[j] -= mirrored_axis1[j];
          }
        }
      }
      /* if required, reverse axis3 to maintain right-handed coordinate system */
      if (0.0 > (
        final_axis3[0] * (final_axis1[1] * final_axis2[2] -
          final_axis1[2] * final_axis2[1]) +
        final_axis3[1] * (final_axis1[2] * final_axis2[0] -
          final_axis1[0] * final_axis2[2]) +
        final_axis3[2] * (final_axis1[0] * final_axis2[1] -
          final_axis1[1] * final_axis2[0]))) {
        final_axis3[0] = -final_axis3[0];
        final_axis3[1] = -final_axis3[1];
        final_axis3[2] = -final_axis3[2];
      }
      return_arrays[0] = [final_point, final_axis1, final_axis2, final_axis3];
      if (repeat_mode == "MIRROR") {
        if (0.0 > (
          mirrored_axis3[0] * (mirrored_axis1[1] * mirrored_axis2[2] -
            mirrored_axis1[2] * mirrored_axis2[1]) +
          mirrored_axis3[1] * (mirrored_axis1[2] * mirrored_axis2[0] -
            mirrored_axis1[0] * mirrored_axis2[2]) +
          mirrored_axis3[2] * (mirrored_axis1[0] * mirrored_axis2[1] -
            mirrored_axis1[1] * mirrored_axis2[0]))) {
          mirrored_axis3[0] = -mirrored_axis3[0];
          mirrored_axis3[1] = -mirrored_axis3[1];
          mirrored_axis3[2] = -mirrored_axis3[2];
        }
        return_arrays[1] = [mirrored_point, mirrored_axis1, mirrored_axis2, mirrored_axis3];
      }
    }
    else if (repeat_mode == "AXES_2D" || repeat_mode == "AXES_3D") {
      let axis_scale = [0.0, 0.0, 0.0];
      let final_point = [0.0, 0.0, 0.0];
      for (var j = 0; j < 3; j++) {
        var sign = (scale[j] < 0.0) ? -1.0 : 1.0;
        axis_scale[j] = (sign * baseSize[0] + scale[j] * scaleFactors[0]) * this.globalScale;
      }
      for (var j = 0; j < 3; j++) {
        final_point[j] = point[j]
          + offset[0] * axis_scale[0] * axis1[j]
          + offset[1] * axis_scale[1] * axis2[j]
          + offset[2] * axis_scale[2] * axis3[j];
      }
      const number_of_glyphs = (repeat_mode == "AXES_2D") ? 2 : 3;
      for (let k = 0; k < number_of_glyphs; k++) {
        let use_axis1, use_axis2;
        const use_scale = scale[k];
        let final_axis1 = [0.0, 0.0, 0.0];
        let final_axis2 = [0.0, 0.0, 0.0];
        let final_axis3 = [0.0, 0.0, 0.0];
        if (k == 0) {
          use_axis1 = axis1;
          use_axis2 = axis2;
        }
        else if (k == 1) {
          use_axis1 = axis2;
          use_axis2 = (repeat_mode == "AXES_2D") ? axis1 : axis3;
        }
        else // if (k == 2)
        {
          use_axis1 = axis3;
          use_axis2 = axis1;
        }
        const final_scale1 = (baseSize[0] + use_scale * scaleFactors[0]) * this.globalScale;
        final_axis1[0] = use_axis1[0] * final_scale1;
        final_axis1[1] = use_axis1[1] * final_scale1;
        final_axis1[2] = use_axis1[2] * final_scale1;
        final_axis3[0] = final_axis1[1] * use_axis2[2] - use_axis2[1] * final_axis1[2];
        final_axis3[1] = final_axis1[2] * use_axis2[0] - use_axis2[2] * final_axis1[0];
        final_axis3[2] = final_axis1[0] * use_axis2[1] - final_axis1[1] * use_axis2[0];
        let magnitude = Math.sqrt(final_axis3[0] * final_axis3[0] + final_axis3[1] * final_axis3[1] + final_axis3[2] * final_axis3[2]);
        if (0.0 < magnitude) {
          let scaling = (baseSize[2] + use_scale * scaleFactors[2]) * this.globalScale / magnitude;
          if ((repeat_mode == "AXES_2D") && (k > 0)) {
            scaling *= -1.0;
          }
          final_axis3[0] *= scaling;
          final_axis3[1] *= scaling;
          final_axis3[2] *= scaling;
        }

        final_axis2[0] = final_axis3[1] * final_axis1[2] - final_axis1[1] * final_axis3[2];
        final_axis2[1] = final_axis3[2] * final_axis1[0] - final_axis1[2] * final_axis3[0];
        final_axis2[2] = final_axis3[0] * final_axis1[1] - final_axis3[1] * final_axis1[0];
        magnitude = Math.sqrt(final_axis2[0] * final_axis2[0] + final_axis2[1] * final_axis2[1] + final_axis2[2] * final_axis2[2]);
        if (0.0 < magnitude) {
          var scaling = (baseSize[1] + use_scale * scaleFactors[1]) * this.globalScale / magnitude;
          final_axis2[0] *= scaling;
          final_axis2[1] *= scaling;
          final_axis2[2] *= scaling;
        }
        return_arrays[k] = [final_point, final_axis1, final_axis2, final_axis3];
      }
    }
    return return_arrays;
  };

  /**
   * Update transformation for each of the glyph in this glyphset.
   */
  const updateGlyphsetTransformation = (
    current_positions,
    current_axis1s,
    current_axis2s,
    current_axis3s,
    current_scales
  ) => {
    let numberOfGlyphs = 1;
    if (repeat_mode == "AXES_2D" || repeat_mode == "MIRROR")
      numberOfGlyphs = 2;
    else if (repeat_mode == "AXES_3D")
      numberOfGlyphs = 3;
    const numberOfPositions = current_positions.length / 3;
    let current_glyph_index = 0;
    _glyph_axis_array.length = numberOfGlyphs;
    for (let i = 0; i < numberOfPositions; i++) {
      const current_index = i * 3;
      const current_position = [current_positions[current_index], current_positions[current_index + 1],
      current_positions[current_index + 2]];
      const current_axis1 = [current_axis1s[current_index], current_axis1s[current_index + 1],
      current_axis1s[current_index + 2]];
      const current_axis2 = [current_axis2s[current_index], current_axis2s[current_index + 1],
      current_axis2s[current_index + 2]];
      const current_axis3 = [current_axis3s[current_index], current_axis3s[current_index + 1],
      current_axis3s[current_index + 2]];
      const current_scale = [current_scales[current_index], current_scales[current_index + 1],
      current_scales[current_index + 2]];
      const arrays = resolve_glyph_axes(current_position, current_axis1, current_axis2,
        current_axis3, current_scale, _glyph_axis_array);
      if (arrays.length == numberOfGlyphs) {
        for (let j = 0; j < numberOfGlyphs; j++) {
          writeTransformMatrix(_transformMatrix, arrays[j]);
          this.morph.setMatrixAt(current_glyph_index, _transformMatrix);
          const glyph = glyphList[current_glyph_index];
          if (glyph) {
            glyph.setTransformation(arrays[j][0], arrays[j][1],
              arrays[j][2], arrays[j][3]);
          }
          current_glyph_index++;
        }
      }
    }
    this.morph.instanceMatrix.needsUpdate = true;
    this.boundingBoxUpdateRequired = true;
    this.morph.computeBoundingSphere();
  };

  /**
   * Update colour for each of the glyph in this glyphset.
   *
   * @param {Array} current_colors - one hex value per raw (pre-repeat_mode-
   * expansion) glyph record.
   * @param {Boolean} labelsOnly - when true, only glyph labels are
   * recoloured - instanceColor is left untouched (not even created). Used
   * for the initial load-time colour of GPU-compute-driven glyphsets (see
   * createGlyphs()): instanceColor must stay uncreated there (see
   * applyGlyphComputeResult's comment on the NodeMaterial double-multiply
   * this avoids), but labels aren't part of the compute-buffer render path
   * at all and would otherwise show no colour until the first accurate
   * resync.
   */
  const updateGlyphsetHexColors = (current_colors, labelsOnly) => {
    let numberOfGlyphs = 1;
    if (repeat_mode == "AXES_2D" || repeat_mode == "MIRROR")
      numberOfGlyphs = 2;
    else if (repeat_mode == "AXES_3D")
      numberOfGlyphs = 3;
    const numberOfColours = current_colors.length;
    let current_glyph_index = 0;
    for (let i = 0; i < numberOfColours; i++) {
      const hex_values = current_colors[i];
      for (let j = 0; j < numberOfGlyphs; j++) {
        _bot_colour.setHex(hex_values)
        if (!labelsOnly) {
          this.morph.setColorAt(current_glyph_index, _bot_colour);
        }
        const glyph = glyphList[current_glyph_index];
        if (glyph)
          glyph.setColour(_bot_colour);
        current_glyph_index++;
      }
    }
    if (!labelsOnly) {
      this.morph.instanceColor.needsUpdate = true;
    }
  };

  /**
   * Writes back a GPU glyph-transform compute readback (see
   * dispatchGlyphCompute) into instanceMatrix/instanceColor - i.e. exactly
   * the data updateGlyphsetTransformation()/updateGlyphsetHexColors() write
   * on the CPU path, so bounding box/raycast/getClosestVertex keep working
   * completely unchanged downstream.
   */
  const applyGlyphComputeResult = (result) => {
    const matrixArray = this.morph.instanceMatrix.array;
    const updateLabels = this.canShowLabel();
    for (let i = 0; i < numberOfVertices; i++) {
      const o4 = i * 4;
      const o16 = i * 16;
      matrixArray[o16] = result.axis1[o4];
      matrixArray[o16 + 1] = result.axis1[o4 + 1];
      matrixArray[o16 + 2] = result.axis1[o4 + 2];
      matrixArray[o16 + 3] = 0;
      matrixArray[o16 + 4] = result.axis2[o4];
      matrixArray[o16 + 5] = result.axis2[o4 + 1];
      matrixArray[o16 + 6] = result.axis2[o4 + 2];
      matrixArray[o16 + 7] = 0;
      matrixArray[o16 + 8] = result.axis3[o4];
      matrixArray[o16 + 9] = result.axis3[o4 + 1];
      matrixArray[o16 + 10] = result.axis3[o4 + 2];
      matrixArray[o16 + 11] = 0;
      matrixArray[o16 + 12] = result.position[o4];
      matrixArray[o16 + 13] = result.position[o4 + 1];
      matrixArray[o16 + 14] = result.position[o4 + 2];
      matrixArray[o16 + 15] = 1;
      if (updateLabels) {
        const glyph = glyphList[i];
        if (glyph) {
          glyph.setTransformation(
            [result.position[o4], result.position[o4 + 1], result.position[o4 + 2]],
            [result.axis1[o4], result.axis1[o4 + 1], result.axis1[o4 + 2]],
            [result.axis2[o4], result.axis2[o4 + 1], result.axis2[o4 + 2]],
            [result.axis3[o4], result.axis3[o4 + 1], result.axis3[o4 + 2]],
          );
        }
      }
    }
    this.morph.instanceMatrix.needsUpdate = true;
    this.boundingBoxUpdateRequired = true;
    this.morph.computeBoundingSphere();

    if (result.color) {
      const colorArray = this.morph.instanceColor ? this.morph.instanceColor.array : undefined;
      for (let i = 0; i < numberOfVertices; i++) {
        const o4 = i * 4;
        if (colorArray) {
          const o3 = i * 3;
          colorArray[o3] = result.color[o4];
          colorArray[o3 + 1] = result.color[o4 + 1];
          colorArray[o3 + 2] = result.color[o4 + 2];
        }
        if (updateLabels) {
          const glyph = glyphList[i];
          if (glyph) {
            _bot_colour.setRGB(result.color[o4], result.color[o4 + 1], result.color[o4 + 2]);
            glyph.setColour(_bot_colour);
          }
        }
      }
      if (colorArray) {
        this.morph.instanceColor.needsUpdate = true;
      }
    }
  };

  /**
   * Kicks off (at most one in flight at a time) an async GPU compute +
   * readback for the current bottom/top frame + proportion. If a previous
   * dispatch is still resolving, this frame's update is skipped rather than
   * queued - the next call to updateMorphGlyphsets() will dispatch with
   * whatever bottom/top/proportion is current *then*, so playback can't
   * fall further and further behind, at the cost of the displayed state
   * lagging the true target time by about one frame while animating.
   */
  const dispatchGlyphCompute = (bottom_frame, top_frame, proportion) => {
    if (glyphComputePending) return;
    const renderer = this.region?.getScene?.()?.getRenderer?.();
    if (!renderer) return;
    glyphCompute.uniforms.bottomFrame.value = bottom_frame;
    glyphCompute.uniforms.topFrame.value = top_frame;
    glyphCompute.uniforms.proportion.value = proportion;
    glyphCompute.uniforms.globalScale.value = this.globalScale;
    glyphComputePending = true;
    boundsAreExact = false;
    dispatchAndReadbackGlyphTransform(renderer, glyphCompute).then((result) => {
      glyphComputePending = false;
      applyGlyphComputeResult(result);
      boundsAreExact = true;
      // Restore the stock InstancedMesh.raycast (instanceMatrix is now
      // exact again) by dropping the no-op instance override, if present.
      delete this.morph.raycast;
    }).catch((err) => {
      glyphComputePending = false;
      console.error("Glyph transform compute readback failed.", err);
    });
  };

  /**
   * The fast per-frame path used while actively playing: only dispatches
   * the compute pass (updating the GPU buffers the render material reads
   * directly - see ../tsl/glyphRenderMaterial.js) with no CPU readback at
   * all, bouding box will not be updated.
   */
  const dispatchGlyphComputeFast = (bottom_frame, top_frame, proportion) => {
    const renderer = this.region?.getScene?.()?.getRenderer?.();
    if (!renderer) return false;
    glyphCompute.uniforms.bottomFrame.value = bottom_frame;
    glyphCompute.uniforms.topFrame.value = top_frame;
    glyphCompute.uniforms.proportion.value = proportion;
    glyphCompute.uniforms.globalScale.value = this.globalScale;
    renderer.compute(glyphCompute.compute);
    boundsAreExact = false;
    this.morph.raycast = () => {};
    renderBuffersInitialized = true;
    return true;
  };

  /**
   * The readback half of the debounced accurate resync (see
   * scheduleAccurateResync): unlike dispatchGlyphCompute(), this does NOT
   * call renderer.compute() first - by the time this fires, the buffers
   * already hold the right result.
   */
  const readbackGlyphComputeOnly = () => {
    if (glyphComputePending) return;
    const renderer = this.region?.getScene?.()?.getRenderer?.();
    if (!renderer) return;
    glyphComputePending = true;
    readbackGlyphTransform(renderer, glyphCompute).then((result) => {
      glyphComputePending = false;
      applyGlyphComputeResult(result);
      boundsAreExact = true;
      delete this.morph.raycast;
    }).catch((err) => {
      glyphComputePending = false;
      console.error("Glyph transform compute readback failed.", err);
    });
  };

  const cancelScheduledAccurateResync = () => {
    if (accurateResyncTimer !== undefined) {
      clearTimeout(accurateResyncTimer);
      accurateResyncTimer = undefined;
    }
  };

  /**
   * (Re)schedules a single accurate resync ACCURATE_RESYNC_DEBOUNCE_MS from
   * now, cancelling any previously scheduled one.
   */
  const scheduleAccurateResync = () => {
    cancelScheduledAccurateResync();
    accurateResyncTimer = setTimeout(() => {
      accurateResyncTimer = undefined;
      readbackGlyphComputeOnly();
    }, ACCURATE_RESYNC_DEBOUNCE_MS);
  };

  /**
   * Update the current states of the glyphs in this glyphset, this includes transformation and
   * colour for each of them. This is called when glyphset and glyphs are initialised and whenever
   * the internal time has been updated.
   *
   * @param {Boolean} debounceAccurateResync - When true the costlier GPU->CPU readback
   * (bounding box/raycast/ export accuracy - see dispatchGlyphCompute) is debounced
   * until updates have been quiet for ACCURATE_RESYNC_DEBOUNCE_MS. When false/omitted
   * (e.g. the render loop's animation-just-stopped resync), the readback happens
   * immediately, as before.
   */
  const updateMorphGlyphsets = (debounceAccurateResync) => {
    const current_time = this.inbuildTime / this.duration * (numberOfTimeSteps - 1);
    const bottom_frame = Math.floor(current_time);
    const proportion = 1 - (current_time - bottom_frame);
    const top_frame = Math.ceil(current_time);

    if (morphVertices && glyphCompute) {
      if (debounceAccurateResync) {
        dispatchGlyphComputeFast(bottom_frame, top_frame, proportion);
        scheduleAccurateResync();
      } else {
        cancelScheduledAccurateResync();
        // GPU path: transform (and colour, if morphColours) for this frame -
        // handles both updateGlyphsetTransformation() and
        // updateGlyphsetHexColors() below in one dispatch.
        dispatchGlyphCompute(bottom_frame, top_frame, proportion);
      }
      return;
    }

    let current_positions = _current_positions;
    let current_axis1s = _current_axis1s;
    let current_axis2s = _current_axis2s;
    let current_axis3s = _current_axis3s;
    let current_scales = _current_scales;
    let current_colors = _current_colors;

    if (morphVertices) {
      const bottom_positions = positions[bottom_frame.toString()];
      const top_positions = positions[top_frame.toString()];
      const bottom_axis1 = axis1s[bottom_frame.toString()];
      const top_axis1 = axis1s[top_frame.toString()];
      const bottom_axis2 = axis2s[bottom_frame.toString()];
      const top_axis2 = axis2s[top_frame.toString()];
      const bottom_axis3 = axis3s[bottom_frame.toString()];
      const top_axis3 = axis3s[top_frame.toString()];
      const bottom_scale = scales[bottom_frame.toString()];
      const top_scale = scales[top_frame.toString()];
      _current_positions.length = bottom_positions.length;
      _current_axis1s.length = bottom_positions.length;
      _current_axis2s.length = bottom_positions.length;
      _current_axis3s.length = bottom_positions.length;
      _current_scales.length = bottom_positions.length;

      for (let i = 0; i < bottom_positions.length; i++) {
        current_positions[i] = proportion * bottom_positions[i] + (1.0 - proportion) * top_positions[i];
        current_axis1s[i] = proportion * bottom_axis1[i] + (1.0 - proportion) * top_axis1[i];
        current_axis2s[i] = proportion * bottom_axis2[i] + (1.0 - proportion) * top_axis2[i];
        current_axis3s[i] = proportion * bottom_axis3[i] + (1.0 - proportion) * top_axis3[i];
        current_scales[i] = proportion * bottom_scale[i] + (1.0 - proportion) * top_scale[i];
      }
    } else {
      current_positions = positions["0"];
      current_axis1s = axis1s["0"];
      current_axis2s = axis2s["0"];
      current_axis3s = axis3s["0"];
      current_scales = scales["0"];
    }
    updateGlyphsetTransformation(current_positions, current_axis1s, current_axis2s, current_axis3s,
      current_scales);
    if (colors != undefined) {
      if (morphColours) {
        const bottom_colors = colors[bottom_frame.toString()];
        const top_colors = colors[top_frame.toString()];
        current_colors.length = bottom_colors.length;
        for (let i = 0; i < bottom_colors.length; i++) {
          _bot_colour.setHex(bottom_colors[i]);
          _top_colour.setHex(top_colors[i]);
          _bot_colour.setRGB(_bot_colour.r * proportion + _top_colour.r * (1 - proportion),
            _bot_colour.g * proportion + _top_colour.g * (1 - proportion),
            _bot_colour.b * proportion + _top_colour.b * (1 - proportion));
          current_colors[i] = _bot_colour.getHex();
        }
      } else {
        current_colors = colors["0"];
      }
      updateGlyphsetHexColors(current_colors, false);
    }
  };

  /**
   * Get the assigned label for instance at index
   */
  this.getLabel = (index) => {
    if (labels && labels.length > index) {
      return labels[index];
    }
    return undefined;
  }

  this.isLabelDisplayed = () => {
    return labelsOn;
  }

  /**
   * Check whether label can be shown
   */
  this.canShowLabel = () => {
    return (glyphList?.length && (labels?.length || this.groupName));
  }

  /**
   * Display the label of the glyphs in the glyphset.
   */
  this.showLabel = () => {
    if (glyphList?.length) {
      labelsOn = true;
      for (let i = 0; i < glyphList.length; i++) {
        glyphList[i].showLabel(this.morph.material ? this.morph.material.color : undefined);
      }
    }
  }

  /**
   * Hide label with the choosen colour.
   */
    this.hideLabel = () => {
      for (let i = 0; i < glyphList.length; i++) {
        glyphList[i].hideLabel();
      }
      labelsOn = false;
    }

  /**
   * Computes a single Box3 that conservatively contains every keyframe's
   * exact per-instance transform of the base glyph geometry, for use as
   * getBoundingBox()'s answer while boundsAreExact is false (see its
   * declaration above for the caveat on this not being a formally proven
   * bound). One-time cost at load, reusing resolve_glyph_axes() the same
   * way updateGlyphsetTransformation() does, just for every keyframe
   * instead of just the current one, unioned together.
   */
  const computeAllFramesBoundingBox = () => {
    const localBox = new THREE.Box3().setFromBufferAttribute(this.geometry.attributes.position);
    const tempMatrix = new THREE.Matrix4();
    const tempBox = new THREE.Box3();
    const tempArray = [];
    const result = new THREE.Box3();
    let first = true;
    for (let t = 0; t < numberOfTimeSteps; t++) {
      const tPositions = positions[t.toString()];
      const tAxis1 = axis1s[t.toString()];
      const tAxis2 = axis2s[t.toString()];
      const tAxis3 = axis3s[t.toString()];
      const tScales = scales[t.toString()];
      if (!tPositions) continue;
      const numberOfPositions = tPositions.length / 3;
      for (let i = 0; i < numberOfPositions; i++) {
        const idx = i * 3;
        const point = [tPositions[idx], tPositions[idx + 1], tPositions[idx + 2]];
        const a1 = [tAxis1[idx], tAxis1[idx + 1], tAxis1[idx + 2]];
        const a2 = [tAxis2[idx], tAxis2[idx + 1], tAxis2[idx + 2]];
        const a3 = [tAxis3[idx], tAxis3[idx + 1], tAxis3[idx + 2]];
        const sc = [tScales[idx], tScales[idx + 1], tScales[idx + 2]];
        const arrays = resolve_glyph_axes(point, a1, a2, a3, sc, tempArray);
        for (let j = 0; j < arrays.length; j++) {
          writeTransformMatrix(tempMatrix, arrays[j]);
          tempBox.copy(localBox).applyMatrix4(tempMatrix);
          if (first) {
            result.copy(tempBox);
            first = false;
          } else {
            result.union(tempBox);
          }
        }
      }
    }
    return first ? undefined : result;
  }

  /**
   * Create the glyphs in the glyphset.
   *
   * @param {Boolean} displayLabels -Flag to determine either the labels should be display or not.
   */
  const createGlyphs = (displayLabels) => {
    for (let i = 0; i < numberOfVertices; i++) {
      const glyph = new Glyph(undefined, undefined, i, this);
      let label = labels ? labels[i] : undefined;
      label = label ? label : this.groupName;
      if (label) {
        glyph.setLabel(label);
      }
      if (numberOfTimeSteps > 0) {
        glyph.setFrustumCulled(false);
      }
      glyphList[i] = glyph;
      this.morph.add(glyph.getGroup());
    }
    //Only display labels if the label list is available
    if (labels && labels.length > 0 && displayLabels) {
      this.showLabel();
    }
    //Update the transformation of the glyphs.
    updateGlyphsetTransformation(positions["0"], axis1s["0"],
      axis2s["0"], axis3s["0"], scales["0"]);
    if (colors != undefined) {
      updateGlyphsetHexColors(colors["0"], !!(glyphCompute && glyphCompute.outputs.color));
    }
    if (glyphCompute) {
      allFramesBoundingBox = computeAllFramesBoundingBox();
    }
    this.ready = true;
  };

  /**
   * Add a custom {@link Glyph} to this {@link Glyphset}.
   *
   * @param {Glyph} Glyph to be added.
   */
  this.addCustomGlyph = glyph => {
    if (glyph.isGlyph)
      glyphList.push(glyph);
    this.ready = true;
    this.boundingBoxUpdateRequired = true;
  }

  /**
   * Add a THREE.Mesh object to be displayed as glyph in this {@link Glyphset}.
   *
   * @param {THREE.Mesh} Mesh to be added.
   * @param {Number} id of the mesh.
   */
  this.addMeshAsGlyph = (mesh, id) => {
    if (mesh.isMesh) {
      const glyph = new Glyph(undefined, undefined, id, this);
      glyph.fromMesh(mesh);
      glyphList.push(glyph);
      this.morph.add(glyph.getGroup())
      this.ready = true;
      this.boundingBoxUpdateRequired = true;
      return glyph;
    }
    return undefined;
  }

  /**
   * A function which iterates through the list of glyphs and call the callback
   * function with the glyph as the argument.
   *
   * @param {Function} callbackFunction - Callback function with the glyph
   * as an argument.
   */
  this.forEachGlyph = callbackFunction => {
    for (let i = 0; i < glyphList.length; i++) {
      callbackFunction(glyphList[i]);
    }
  }

  var meshloader = (finishCallback, displayLabels) => {
    return (geometry, materials) => {
      if (disposed) {
        geometry.dispose();
        return;
      }
      this.geometry.copy(geometry);
      this.geometry.computeBoundingSphere();
      this.geometry.computeBoundingBox();
      if (materials && materials[0])
        this.morph.material = materials[0];
      if (glyphCompute) {
        this.morph.material = createGlyphInstancedMaterial(this.morph.material, glyphCompute);
      }
      createGlyphs(displayLabels);
      this.morph.name = this.groupName;
      this.morph.userData = this;
      this.setMorph(this.morph);
      geometry.dispose();
      if (finishCallback != undefined && (typeof finishCallback == 'function'))
        finishCallback(this);
    };
  }

  /**
 * Get the index of the closest vertex to centroid.
 */
  this.getClosestVertexIndex = function () {
    let closestIndex = -1;
    if (this.morph && this.ready) {
      this.getBoundingBox().getCenter(this._v1);
      let current_positions = positions["0"];
      const numberOfPositions = current_positions.length / 3;
      let distance = -1;
      let currentDistance = 0;
      for (let i = 0; i < numberOfPositions; i++) {
        const current_index = i * 3;
        this._v2.set(current_positions[current_index],
          current_positions[current_index + 1],
          current_positions[current_index + 2]);
        currentDistance = this._v1.distanceTo(this._v2);
        if (distance == -1) {
          distance = currentDistance;
          closestIndex = i;
        } else if (distance > currentDistance) {
          distance = currentDistance;
          closestIndex = i;
        }
      }
    }
    return closestIndex;
  }

  /**
   * Get the  closest vertex to centroid.
   */
  this.getClosestVertex = function () {

    if (this.closestVertexIndex == -1) {
      this.closestVertexIndex = this.getClosestVertexIndex();
    }
    if (this.closestVertexIndex >= 0) {
      /*
      if (glyphList && glyphList[this.closestVertexIndex]) {
        glyphList[this.closestVertexIndex].getBoundingBox().getCenter(position);
      }
      */
      if (this.morph) {
        let position = new THREE.Vector3();
        this.morph.getMatrixAt(this.closestVertexIndex, _transformMatrix);
        position.setFromMatrixPosition(_transformMatrix);
        return position;
      }
    }

    return undefined;
  }

  /**
   * Get the bounding box for the whole set of glyphs.
   *
   * @return {Three.Box3};
   */
  this.getBoundingBox = () => {
    if (this.morph && this.ready && this.morph.visible) {
      if (glyphCompute && !boundsAreExact && allFramesBoundingBox) {
        this.cachedBoundingBox.copy(allFramesBoundingBox);
        this.morph.updateWorldMatrix(true, true);
        this.cachedBoundingBox.applyMatrix4(this.morph.matrixWorld);
        return this.cachedBoundingBox;
      }
      if (this.boundingBoxUpdateRequired) {
        _boundingBox1.setFromBufferAttribute(
          this.morph.geometry.attributes.position);
        for (let i = 0; i < numberOfVertices; i++) {
          this.morph.getMatrixAt(i, _transformMatrix);
          _boundingBox2.copy(_boundingBox1).applyMatrix4(_transformMatrix);
          if (i == 0) {
            _boundingBox3.copy(_boundingBox2);
          } else {
            _boundingBox3.union(_boundingBox2);
          }
        }
        if (_boundingBox3) {
          this.cachedBoundingBox.copy(_boundingBox3);
          this.morph.updateWorldMatrix(true, true);
          this.cachedBoundingBox.applyMatrix4(this.morph.matrixWorld);
          this.boundingBoxUpdateRequired = false;
        } else
          return undefined;
      }
      return this.cachedBoundingBox;
    }
    return undefined;
  }

  /**
   * Set the local time of this glyphset.
   *
   * @param {Number} time - Can be any value between 0 to duration.
   */
  this.setMorphTime = time => {
    if (time > this.duration)
      this.inbuildTime = this.duration;
    else if (0 > time)
      this.inbuildTime = 0;
    else
      this.inbuildTime = time;
    if (morphColours || morphVertices) {
      updateMorphGlyphsets(true);
      if (morphVertices)
        this.markerUpdateRequired = true;
    }
  }

  /**
   * Check if the glyphset is time varying.
   *
   * @return {Boolean}
   */
  this.isTimeVarying = () => {
    if (((this.ready === false) || (numberOfTimeSteps > 0)) &&
      (morphColours || morphVertices))
      return true;
    return false;
  }

  /**
   * Get the current inbuild time of the
   *
   * @return {Number}
   */
  this.getCurrentTime = () => {
    return this.inbuildTime;
  }

  /**
   * Exporters (see sceneExporter.js/GLTFExporter.js) read
   * THREE.InstancedMesh.instanceColor directly off this.morph - which
   * createGlyphs() intentionally leaves null whenever colour is
   * glyphCompute-driven. No-op for glyphsets whose colour isn't glyphCompute-driven
   * (instanceColor there is already accurate, ordinary CPU-driven state).
   *
   * @return {Promise}
   */
  this.prepareColorForExport = async () => {
    if (!(glyphCompute && glyphCompute.outputs.color)) return;
    const renderer = this.region?.getScene?.()?.getRenderer?.();
    if (!renderer) return;
    renderer.compute(glyphCompute.compute);
    const colorResult = new Float32Array(
      await renderer.getArrayBufferAsync(glyphCompute.outputs.color.value));
    // setColorAt(0, ...) is only here to lazily allocate instanceColor the
    // same way the stock InstancedMesh API would; the loop below overwrites
    // every instance (including 0) with the real snapshot right after.
    this.morph.setColorAt(0, _bot_colour);
    const colorArray = this.morph.instanceColor.array;
    for (let i = 0; i < numberOfVertices; i++) {
      const o4 = i * 4;
      const o3 = i * 3;
      colorArray[o3] = colorResult[o4];
      colorArray[o3 + 1] = colorResult[o4 + 1];
      colorArray[o3 + 2] = colorResult[o4 + 2];
    }
    this.morph.instanceColor.needsUpdate = true;
  }

  /**
   * Undoes prepareColorForExport() - see its comment for why this matters:
   * without it, the next live render would permanently pick up the stale
   * instanceColor multiply bug this whole design avoids.
   */
  this.clearColorExportState = () => {
    if (glyphCompute && glyphCompute.outputs.color && this.morph.instanceColor) {
      this.morph.instanceColor = null;
      if (this.morph.material) this.morph.material.needsUpdate = true;
    }
  }

  /**
   * Set the objects scale.
   *
   * @return {THREE.Box3}.
   */
  this.setScaleAll = function(scale) {
    this.globalScale = scale;
    updateMorphGlyphsets(false);
  }

  /**
   * Clear this glyphset and its list of glyphs which will release them from the memory.
   */
  this.dispose = () => {
    disposed = true;
    for (let i = glyphList.length - 1; i >= 0; i--) {
      glyphList[i].dispose();
    }
    if (this.geometry)
      this.geometry.dispose();
    if (this.morph)
      this.morph.material.dispose();
    cancelScheduledAccurateResync();
    axis1s = undefined;
    axis2s = undefined;
    axis3s = undefined;
    positions = undefined;
    scales = undefined;
    colors = undefined;
    glyphCompute = undefined;
    glyphComputePending = false;
    boundsAreExact = true;
    renderBuffersInitialized = false;
    wasAnimating = false;
    allFramesBoundingBox = undefined;
    this.ready = false;
    this.groupName = undefined;
  }

  /**
   * Update the glyphsets if required the render.
   */
  this.render = (delta, playAnimation, options) => {
    if (glyphCompute && !renderBuffersInitialized) {
      const renderer = this.region?.getScene?.()?.getRenderer?.();
      if (renderer) {
        renderer.compute(glyphCompute.compute);
        renderBuffersInitialized = true;
      }
    }
    if (playAnimation == true) {
      let targetTime = this.inbuildTime + delta;
      if (targetTime > this.duration)
        targetTime = targetTime - this.duration;
      this.inbuildTime = targetTime;
      if (morphVertices && glyphCompute) {
        // Fast GPU-only path: update the render buffers every frame with
        // no CPU readback. Colour (if morphColours) rides along in the
        // same compute pass/buffers - see glyphRenderMaterial.js's colorNode.
        // Also drop any accurate resync a prior setMorphTime() call (e.g. a
        // downstream slider) left debounced-and-pending - it would apply a
        // now-stale frame once it fired mid-animation otherwise.
        cancelScheduledAccurateResync();
        const current_time = this.inbuildTime / this.duration * (numberOfTimeSteps - 1);
        const bottom_frame = Math.floor(current_time);
        const proportion = 1 - (current_time - bottom_frame);
        const top_frame = Math.ceil(current_time);
        dispatchGlyphComputeFast(bottom_frame, top_frame, proportion);
      } else if (morphColours || morphVertices) {
        updateMorphGlyphsets(false);
      }
      wasAnimating = true;
    } else {
      if (wasAnimating && glyphCompute) {
        // Just stopped: one accurate resync so bounding-box/raycast are
        // exact again for as long as playback stays paused.
        updateMorphGlyphsets(false);
      }
      wasAnimating = false;
    }
    this.updateMarker(playAnimation, options);
  }
}

Glyphset.prototype = Object.create(ZincObject.prototype);
export { Glyphset };
