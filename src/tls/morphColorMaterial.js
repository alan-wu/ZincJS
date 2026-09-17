import * as THREE from 'three/webgpu';
import { Fn, attribute, materialColor, materialOpacity, mix, uniform, vec4 } from 'three/tsl';

//Maps a classic material's constructor name to its NodeMaterial
//equivalent, since only NodeMaterial exposes colorNode.
const NODE_MATERIAL_CLASSES = {
  MeshBasicMaterial: THREE.MeshBasicNodeMaterial,
  MeshLambertMaterial: THREE.MeshLambertNodeMaterial,
  MeshPhongMaterial: THREE.MeshPhongNodeMaterial,
  MeshStandardMaterial: THREE.MeshStandardNodeMaterial,
  LineBasicMaterial: THREE.LineBasicNodeMaterial,
};

/**
 * Give `material` a colorNode that blends between the two morph colour
 * targets {@link updateMorphColorAttribute} (in utilities.js) keeps
 * published as the 'morphColor0'/'morphColor1' geometry attributes -
 * whichever two morph targets currently have non-zero influence.
 *
 * This replaces the legacy `material.onBeforeCompile = augmentMorphColor`
 * approach, which patched raw GLSL into the classic WebGL shader and has no
 * effect once a material is compiled through the WebGPU/TSL pipeline.
 * three.js's own built-in WebGPU morph target system packs morph colour
 * data into its morph texture (see three's Morph.js) but its blend loop
 * only ever applies the result to position/normal, never colour, so this
 * has to be done by hand.
 *
 * Converts `material` to its NodeMaterial equivalent first if it isn't one
 * already, since only NodeMaterial exposes `colorNode`.
 *
 * @param {THREE.Material} material - Material to give the morph colour
 * blend to; only used for its constructor type if not already a
 * NodeMaterial - all of its usual properties (color, opacity, map, side,
 * etc.) are preserved.
 * @return {THREE.NodeMaterial} The (possibly newly converted) material.
 * Its `userData.uniforms.morphColorMix` uniform drives the blend (0 = fully
 * morphColor0, 1 = fully morphColor1) - kept in sync automatically by
 * updateMorphColorAttribute.
 */
const applyMorphColorNode = (material) => {
  let target = material;
  if (!target.isNodeMaterial) {
    const NodeMaterialClass = NODE_MATERIAL_CLASSES[material.type] || THREE.MeshBasicNodeMaterial;
    target = new NodeMaterialClass();
    target.copy(material);
  }

  const morphColorMix = uniform(0);

  //materialColor already folds in material.color and, if present, .map -
  //multiplying it by the blended per vertex morph colour keeps that
  //compositing instead of replacing it outright.
  target.colorNode = Fn(() => {
    const colorA = attribute('morphColor0', 'vec3');
    const colorB = attribute('morphColor1', 'vec3');
    const blended = mix(colorA, colorB, morphColorMix);
    return vec4(blended.mul(materialColor), materialOpacity);
  })();

  target.userData.uniforms = { ...target.userData.uniforms, morphColorMix };

  return target;
};

export { applyMorphColorNode };
