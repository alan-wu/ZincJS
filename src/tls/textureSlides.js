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

const dummyData = new Uint8Array(32);

const placeholderTexture = new THREE.Data3DTexture(dummyData, 2, 2, 2);
placeholderTexture.image = {
    data: dummyData,
    width: 2,
    height: 2,
    depth: 2,
};

placeholderTexture.format = THREE.RGBAFormat;
placeholderTexture.type = THREE.UnsignedByteType; // Be explicit for WebGPU
placeholderTexture.minFilter = THREE.LinearFilter;
placeholderTexture.magFilter = THREE.LinearFilter;
placeholderTexture.generateMipmaps = false; // WebGPU cannot auto-generate mipmaps for custom Data3D
placeholderTexture.unpackAlignment = 1;
placeholderTexture.needsUpdate = true;

  // Define Uniforms
  const uniforms = {
    brightness:   uniform(0),
    contrast:     uniform(1),
    depth:        uniform(1),
    discardAlpha: uniform(true),
    direction:    uniform(1),
    flipY:        uniform(true),
    flipZ:        uniform(false),
    nChannels:    uniform(1),
    maskEnabled:  uniform(false),
    slide:        uniform(new THREE.Vector3(0, 0, 1)),
    time:         uniform(0)
  };

  // Share Varyings via TSL
  // A TSL varying automatically wires itself from the vertex stage to the fragment stage.
  const vUw = varying(vec3(0.0), 'vUw');
  uniforms.diffuse0 = texture3D(placeholderTexture, vUw);
  uniforms.diffuse1 = texture3D(placeholderTexture, vUw);
  uniforms.mask = texture3D(placeholderTexture, vUw);

  // Vertex Node
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
    vUw.assign(vec3(slidePos.x, slidePos.y, slidePos.z));

    return positionLocal;
  });


  // Fragment Node
  const fragmentNode = Fn(() => {
    // diffuse0/diffuse1/mask are already-built texture3D sampling nodes.
    const color0 = uniforms.diffuse0.r;
    const color1 = uniforms.diffuse1.r;

    const color = mix(color0, color1, uniforms.time).toVar();

    // Mask implementation & discard logic
    If(uniforms.maskEnabled.and(uniforms.discardAlpha), () => {
      const maskVal = uniforms.mask.r;
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

   // Assign to NodeMaterial slots
  // TSL handles the base vertex transformation automatically, positionNode hooks custom vertex behaviour.
  material.positionNode = vertexNode();
  material.colorNode = fragmentNode();

  // Expose the uniforms reference so your application loop can update them via material.userData
  material.userData.uniforms = uniforms;

  return material;
}
