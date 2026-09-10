import * as THREE from 'three/webgpu';
import {
  Fn,
  uniform,
  vec3,
  vec4,
  texture3D,
  mix,
  positionLocal,
  Discard,
  If,
  varying,
  float,
} from 'three/tsl';

export function createWebGPUMaterial() {
  const material = new THREE.MeshBasicNodeMaterial({
    side: THREE.DoubleSide
  });
  const dummyData = new Uint8Array([0, 0, 0, 0]);
  const placeholderTexture = new THREE.Data3DTexture(dummyData, 1, 1, 1);
  placeholderTexture.needsUpdate = true;

  // --- 1. Define Uniforms ---
  const uniforms = {
    brightness:   uniform(0),
    contrast:     uniform(1),
    depth:        uniform(1),
    discardAlpha: uniform(true),
    diffuse0:     placeholderTexture,
    diffuse1:     placeholderTexture,
    mask:         placeholderTexture,
    direction:    uniform(1),
    flipY:        uniform(true),
    flipZ:        uniform(false),
    nChannels:    uniform(1),
    maskEnabled:  uniform(false),
    slide:        uniform(new THREE.Vector3(0, 0, 1)),
    time:         uniform(0)
  };

  // --- 2. Share Varyings via TSL ---
  // A TSL varying automatically wires itself from the vertex stage to the fragment stage.
  const vUw = varying(vec3(0.0), 'vUw');

  // --- 3. Vertex Node ---
  const vertexNode = Fn(() => {
    // positionLocal provides position.xyz out-of-the-box
    const slidePos = vec3(positionLocal).toVar();

    // Handle direction branching
    If(uniforms.direction.equal(1), () => {
      slidePos.assign(vec3(uniforms.slide.x, positionLocal.y, positionLocal.x));
    });
    If(uniforms.direction.equal(2), () => {
      slidePos.assign(vec3(positionLocal.x, uniforms.slide.y, positionLocal.y));
    });
    If(uniforms.direction.equal(3), () => {
      slidePos.assign(vec3(positionLocal.x, positionLocal.y, uniforms.slide.z));
    });

    // Handle flipping
    If(uniforms.flipY, () => {
      slidePos.y.assign(float(1.0).sub(slidePos.y));
    });
    If(uniforms.flipZ, () => {
      slidePos.z.assign(float(1.0).sub(slidePos.z));
    });

    // Write to our varying
    vUw.assign(vec3(slidePos.x, slidePos.y, slidePos.z.mul(uniforms.depth)));

    return positionLocal;
  });


  // --- 4. Fragment Node ---
  const fragmentNode = Fn(() => {
    // texture3D is used for texture(sampler2DArray, vec3) lookups in TSL
    const color0 = texture3D(uniforms.diffuse0, vUw).r;
    const color1 = texture3D(uniforms.diffuse1, vUw).r;

    const color = mix(color0, color1, uniforms.time).toVar();

    // Mask implementation & discard logic
    If(uniforms.maskEnabled.and(uniforms.discardAlpha), () => {
      const maskVal = texture3D(uniforms.mask, vUw).r;
      If(maskVal.equal(0.0), () => {
        Discard();
      });
    });

    // Brightness calculations
    const brightenedColor = vec3(color).add(vec3(uniforms.brightness));

    // Contrast calculations
    const contrastedColor = brightenedColor.sub(vec3(0.5)).mul(uniforms.contrast).add(vec3(0.5));

    return vec4(contrastedColor, 1.0);
  });

   // --- 5. Assign to NodeMaterial slots ---
  // TSL handles the base vertex transformation automatically, positionNode hooks custom vertex behaviour.
  material.positionNode = vertexNode();
  material.colorNode = fragmentNode();

  // Expose the uniforms reference so your application loop can update them via material.userData
  material.userData.uniforms = uniforms;

  return material;
}
