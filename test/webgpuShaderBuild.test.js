import * as THREE from 'three/webgpu';
import { describe, it, expect, beforeAll } from 'vitest';
import { create as createGPU, globals as gpuGlobals } from 'webgpu';
import { JSONLoader } from '../src/loaders/JSONLoader';
import { Lines } from '../src/primitives/lines';
import { Geometry } from '../src/primitives/geometry';

//These tests exist because none of the JS level checks in
//loaderRegressions.test.js actually trigger a real WGSL shader build - the
//crash this guards against (three's Morph.js indexing past the end of an
//empty morphAttributes.normal/.color array) only happens once
//WGSLNodeBuilder.build() runs, which requires an actual
//renderer.render(scene, camera) call. So this file sets up its own tiny
//real WebGPU renderer (same approach as test/zinc.test.js) rather than
//reusing the shared one, to force that build to happen.
//
//JSONLoader now always computes morphAttributes.normal itself (via
//BufferGeometry.computeVertexNormals()) whenever morphTargets are present
//and the file doesn't supply morphNormals explicitly, so the "missing
//morph normal" case these tests originally targeted can no longer occur
//through JSONLoader - the render-without-throwing assertion is kept as a
//general regression guard for the morph shader build path.

const SIZE = 4;
const bit = (...positions) => positions.reduce((v, p) => v | (1 << p), 0);

function createFakeCanvasContext(device, width, height) {
  let texture;
  return {
    configure(descriptor) {
      if (texture) texture.destroy();
      texture = device.createTexture({
        size: [width, height],
        format: descriptor.format,
        usage: descriptor.usage,
      });
    },
    unconfigure() {
      if (texture) {
        texture.destroy();
        texture = undefined;
      }
    },
    getCurrentTexture() {
      return texture;
    },
  };
}

let renderer;

beforeAll(async () => {
  Object.assign(globalThis, gpuGlobals);
  const gpu = createGPU([]);
  navigator.gpu = gpu;
  const adapter = await gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const context = createFakeCanvasContext(device, SIZE, SIZE);
  renderer = new THREE.WebGPURenderer({ device, context });
  await renderer.init();
  //Match the renderer's own idea of its canvas size to the fake context's
  //texture, or its internally sized depth attachment (from the default
  //300x150 canvas) won't match and WebGPU's stricter validation rejects it.
  renderer.setSize(SIZE, SIZE);
});

describe('WebGPU shader build for morph geometry', () => {
  it('renders a Lines object with morphTargets but no morphNormals without throwing', () => {
    const loader = new JSONLoader();
    const json = {
      metadata: { formatVersion: 3 },
      vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
      faces: [0, 0, 1, 2],
      morphTargets: [
        { name: 'frame000001', vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0] },
        { name: 'frame000002', vertices: [1, 1, 1, 2, 1, 1, 2, 2, 1] },
        { name: 'frame000003', vertices: [2, 2, 2, 3, 2, 2, 3, 2, 1] },
      ],
      // deliberately no morphNormals
    };
    const { geometry } = loader.parse(json, '');

    const lines = new Lines();
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    lines.createLineSegment(geometry, material, {
      localTimeEnabled: false,
      localMorphColour: false,
    });
    //JSONLoader computed these itself since the file had morphTargets but
    //no explicit morphNormals - one per morph target.
    expect(lines.getMorph().geometry.morphAttributes.normal.length).toBe(3);

    const scene = new THREE.Scene();
    scene.add(lines.getGroup());
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    expect(() => renderer.render(scene, camera)).not.toThrow();
  });

  it('renders a Geometry mesh with morphTargets but no morphNormals without throwing', () => {
    const loader = new JSONLoader();
    const json = {
      metadata: { formatVersion: 3 },
      vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
      faces: [bit(), 0, 1, 2],
      morphTargets: [
        { name: 'frame000001', vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0] },
        { name: 'frame000002', vertices: [1, 1, 1, 2, 1, 1, 2, 2, 1] },
      ],
      materials: [{ colorDiffuse: [1, 1, 1], opacity: 1 }],
    };
    const { geometry } = loader.parse(json, '');

    const zincGeometry = new Geometry();
    zincGeometry.createMesh(geometry, undefined, {
      localTimeEnabled: false,
      localMorphColour: false,
      colour: 0xffffff,
      opacity: 1,
    });
    //JSONLoader computed these itself since the file had morphTargets but
    //no explicit morphNormals - one per morph target.
    expect(zincGeometry.getMorph().geometry.morphAttributes.normal.length).toBe(2);

    const scene = new THREE.Scene();
    scene.add(zincGeometry.getGroup());
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    expect(() => renderer.render(scene, camera)).not.toThrow();
  });
});
