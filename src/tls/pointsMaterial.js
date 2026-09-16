import * as THREE from 'three/webgpu';
import {
  Fn,
  attribute,
  cameraProjectionMatrix,
  materialColor,
  materialOpacity,
  mix,
  modelViewMatrix,
  positionGeometry,
  screenDPR,
  texture,
  uniform,
  uv,
  vec4,
  viewportSize,
} from 'three/tsl';

/**
 * Provide the node material used to render a {@link Pointset}.
 *
 * Every point is a single instance of a small quad which is billboarded
 * towards the camera and kept at a constant size in pixels (mirroring the
 * behaviour of the legacy `THREE.PointsMaterial` with `sizeAttenuation`
 * set to `false`). Per instance position comes from the `instancePosition`
 * buffer attribute rather than `instanceMatrix`, since the on screen offset
 * of the quad's corners is entirely computed on the GPU and does not need
 * a per instance transform.
 *
 * @param {THREE.Texture} mapTexture - Texture used to draw a circular dot,
 * its alpha channel is used for the alpha test cut out.
 * @return {THREE.MeshBasicNodeMaterial}
 */
const _rendererSize = /*@__PURE__*/ new THREE.Vector2();

const createInstancedPointsMaterial = (mapTexture) => {
  const material = new THREE.MeshBasicNodeMaterial();

  const uniforms = {
    pointSize: uniform(10),
    sizeAttenuation: uniform(0),
    viewportScale: uniform(1).onFrameUpdate(function ({ renderer }) {
      const size = renderer.getSize(_rendererSize);
      this.value = 0.5 * size.y;
    }),
  };

  material.vertexNode = Fn(() => {
    const instancePosition = attribute('instancePosition', 'vec3');
    const mvPosition = modelViewMatrix.mul(vec4(instancePosition, 1.0));

    let pointSize = uniforms.pointSize.mul(screenDPR);
    const attenuatedSize = pointSize.mul(uniforms.viewportScale.div(mvPosition.z.negate()));
    pointSize = mix(pointSize, attenuatedSize, uniforms.sizeAttenuation);

    let offset = positionGeometry.xy.mul(pointSize);
    offset = offset.div(viewportSize.div(2));

    const clip = cameraProjectionMatrix.mul(mvPosition);
    offset = offset.mul(clip.w);

    return vec4(clip.xy.add(offset), clip.z, clip.w);
  })();

  material.colorNode = Fn(() => {
    const texColor = texture(mapTexture, uv());
    return vec4(texColor.rgb.mul(materialColor), texColor.a.mul(materialOpacity));
  })();

  material.userData.uniforms = uniforms;
  //Plain, introspectable mirrors of the uniforms above - matches the
  //legacy THREE.PointsMaterial API (material.size/sizeAttenuation).
  material.size = uniforms.pointSize.value;
  material.sizeAttenuation = !!uniforms.sizeAttenuation.value;

  return material;
};

export { createInstancedPointsMaterial };
