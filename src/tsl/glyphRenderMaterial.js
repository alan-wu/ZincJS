import * as THREE from 'three/webgpu';
import { Fn, instanceIndex, positionGeometry, materialColor, materialOpacity, vec4 } from 'three/tsl';
import { NODE_MATERIAL_CLASSES } from './morphColorMaterial';

/**
 * Builds a NodeMaterial that renders each glyph instance's transform and
 * colour read directly from a glyphCompute's (see ../tsl/glyphTransform.js)
 * GPU output buffers, via a custom positionNode/colorNode - i.e. no
 * instanceMatrix/instanceColor CPU sync is involved in producing what gets
 * drawn. This is what lets Glyphset render every frame of an animation
 * straight from the compute pass's output with zero GPU->CPU readback.
 *
 * Per NodeMaterial.setupPosition(), setting `positionNode` fully replaces
 * (not composes with) the automatic per-instance instanceMatrix transform a
 * stock THREE.InstancedMesh would otherwise apply - so instanceMatrix is
 * simply irrelevant to rendering once this is set, no double-transform risk.
 * (instanceMatrix is still kept in sync separately, when paused, purely so
 * Glyphset's existing bounding-box/raycast code - which does need a
 * CPU-side transform to read - keeps working unmodified.)
 *
 * @param {THREE.Material} sourceMaterial - the material JSONLoader produced
 *   for this glyph geometry; converted to its NodeMaterial equivalent.
 * @param {Object} glyphCompute - return value of createGlyphTransformCompute().
 * @returns {THREE.NodeMaterial}
 */
function createGlyphInstancedMaterial(sourceMaterial, glyphCompute) {
  let material = sourceMaterial;
  if (!material || !material.isNodeMaterial) {
    const NodeMaterialClass = (sourceMaterial && NODE_MATERIAL_CLASSES[sourceMaterial.type]) || THREE.MeshPhongNodeMaterial;
    material = new NodeMaterialClass();
    if (sourceMaterial) material.copy(sourceMaterial);
  }

  const { position, axis1, axis2, axis3, color } = glyphCompute.outputs;

  material.positionNode = Fn(() => {
    const idx = instanceIndex;
    return position.element(idx)
      .add(axis1.element(idx).mul(positionGeometry.x))
      .add(axis2.element(idx).mul(positionGeometry.y))
      .add(axis3.element(idx).mul(positionGeometry.z));
  })();

  if (color) {
    material.colorNode = Fn(() => {
      return vec4(color.element(instanceIndex).mul(materialColor), materialOpacity);
    })();
  }

  return material;
}

export { createGlyphInstancedMaterial };
