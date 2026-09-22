import * as THREE from 'three/webgpu';
import { describe, it, expect } from 'vitest';
import { JSONLoader } from '../src/loaders/JSONLoader';
import { Geometry } from '../src/primitives/geometry';
import { Lines } from '../src/primitives/lines';
import { Pointset } from '../src/primitives/pointset';
import { TubeLines } from '../src/primitives/tubeLines';

const bit = (...positions) => positions.reduce((v, p) => v | (1 << p), 0);

describe('Geometry/Pointset colour and video regressions', () => {
  it('geometry primitive wires up colour-only morph (no morphTargets)', () => {
    const loader = new JSONLoader();
    const json = {
      metadata: { formatVersion: 3 },
      vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
      colors: [0xff0000, 0x00ff00, 0x0000ff],
      faces: [bit(), 0, 1, 2],
      morphColors: [
        { name: 'anim000001', colors: [1, 0, 0, 0, 1, 0, 0, 0, 1] },
        { name: 'anim000002', colors: [0, 0, 1, 1, 0, 0, 0, 1, 0] },
      ],
      materials: [{ colorDiffuse: [1, 1, 1], opacity: 1 }],
    };
    const { geometry } = loader.parse(json, '');

    const zincGeometry = new Geometry();
    zincGeometry.createMesh(geometry, undefined, {
      localTimeEnabled: false,
      localMorphColour: true,
      colour: 0xffffff,
      opacity: 1,
    });
    const morph = zincGeometry.getMorph();
    expect(morph.geometry.morphAttributes.color).toBeDefined();
    expect(morph.geometry.morphAttributes.color.length).toBe(2);
    //The morph colour blend is now done via a colorNode (WebGPU/TSL),
    //not the legacy onBeforeCompile GLSL patch which has no effect once a
    //material is compiled through the WebGPU pipeline.
    expect(morph.material.isNodeMaterial).toBe(true);
    expect(morph.material.colorNode).toBeDefined();
    expect(morph.material.userData.uniforms.morphColorMix).toBeDefined();
    expect(zincGeometry.clipAction).toBeDefined();
  });

  it('geometry primitive morph colour blend is live across playback', () => {
    const loader = new JSONLoader();
    const json = {
      metadata: { formatVersion: 3 },
      vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
      colors: [0xff0000, 0x00ff00, 0x0000ff],
      faces: [bit(), 0, 1, 2],
      morphColors: [
        { name: 'anim000001', colors: [1, 0, 0, 0, 1, 0, 0, 0, 1] },
        { name: 'anim000002', colors: [0, 0, 1, 1, 0, 0, 0, 1, 0] },
      ],
      materials: [{ colorDiffuse: [1, 1, 1], opacity: 1 }],
    };
    const { geometry } = loader.parse(json, '');

    const zincGeometry = new Geometry();
    zincGeometry.createMesh(geometry, undefined, {
      localTimeEnabled: false,
      localMorphColour: true,
      colour: 0xffffff,
      opacity: 1,
    });
    const morph = zincGeometry.getMorph();
    const mixUniform = morph.material.userData.uniforms.morphColorMix;
    //The animation clip's own natural duration (2 frames @ 10fps = 0.2s) -
    //ZincObject.setDuration() rescales playback to whatever "scene
    //duration" it is given (defaults to 6000s), so match it here to
    //actually traverse the loop within a handful of render() calls.
    zincGeometry.setDuration(0.2);

    //morphColor0/1 stay pinned to targets 0/1 throughout (there are only
    //two morph colour targets in this file), so the thing that actually
    //has to move across a full crossfade loop is the mix uniform itself -
    //check it sweeps a wide range rather than being stuck at its initial
    //fallback value of 0.
    let minMix = Infinity;
    let maxMix = -Infinity;
    for (let i = 0; i < 20; i++) {
      zincGeometry.render(0.02, true);
      minMix = Math.min(minMix, mixUniform.value);
      maxMix = Math.max(maxMix, mixUniform.value);
    }
    expect(minMix).toBeLessThan(0.2);
    expect(maxMix).toBeGreaterThan(0.8);
  });

  it('lines primitive wires up colour-only morph the same way', () => {
    const loader = new JSONLoader();
    const json = {
      metadata: { formatVersion: 3 },
      vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
      colors: [0xff0000, 0x00ff00, 0x0000ff],
      faces: [bit(), 0, 1, 2],
      morphColors: [
        { name: 'anim000001', colors: [1, 0, 0, 0, 1, 0, 0, 0, 1] },
        { name: 'anim000002', colors: [0, 0, 1, 1, 0, 0, 0, 1, 0] },
      ],
      materials: [{ colorDiffuse: [1, 1, 1], opacity: 1 }],
    };
    const { geometry } = loader.parse(json, '');

    const lines = new Lines();
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    lines.createLineSegment(geometry, material, {
      localTimeEnabled: false,
      localMorphColour: true,
    });
    const morph = lines.getMorph();
    expect(morph.material.isNodeMaterial).toBe(true);
    expect(morph.material.colorNode).toBeDefined();
    expect(morph.material.userData.uniforms.morphColorMix).toBeDefined();
  });

  it('geometry primitive picks up a video material', () => {
    const loader = new JSONLoader();
    const json = {
      metadata: { formatVersion: 3 },
      vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
      faces: [bit(3), 0, 1, 2, 0, 1, 2], // hasFaceVertexUv
      uvs: [[0, 0, 1, 0, 1, 1]],
      materials: [{ colorDiffuse: [1, 1, 1], opacity: 1, video: 'test.mp4' }],
    };
    const { geometry } = loader.parse(json, '');
    expect(geometry._video).toBeDefined();

    const zincGeometry = new Geometry();
    zincGeometry.createMesh(geometry, undefined, {
      localTimeEnabled: false,
      localMorphColour: false,
      colour: 0xffffff,
      opacity: 1,
    });
    expect(zincGeometry.videoHandler).toBeDefined();
    expect(zincGeometry.getMorph().material.map).toBeDefined();
  });

  it('pointset applies static (non morph) per vertex colour', () => {
    const loader = new JSONLoader();
    const json = {
      metadata: { formatVersion: 3 },
      vertices: [0, 0, 0, 1, 0, 0, 2, 0, 0],
      colors: [0xff0000, 0x00ff00, 0x0000ff],
      faces: [0, 0, 0, 0, 0, 0, 0],
      materials: [{ colorDiffuse: [1, 1, 1], opacity: 1 }],
    };
    const { geometry } = loader.parse(json, '');

    const material = new THREE.PointsMaterial({ color: 0xffffff, opacity: 1 });
    const pointset = new Pointset();
    pointset.createMesh(geometry, material, { localTimeEnabled: false, localMorphColour: false });
    const mesh = pointset.getMorph();
    expect(mesh.instanceColor).toBeDefined();
    expect(mesh.instanceColor.getX(0)).toBeCloseTo(1);
    expect(mesh.instanceColor.getY(0)).toBeCloseTo(0);
    expect(mesh.instanceColor.getZ(0)).toBeCloseTo(0);
    expect(mesh.instanceColor.getX(1)).toBeCloseTo(0);
    expect(mesh.instanceColor.getY(1)).toBeCloseTo(1);
  });

  it('pointset morph position starts moving immediately, not halfway through the duration', () => {
    const loader = new JSONLoader();
    const json = {
      metadata: { formatVersion: 3 },
      vertices: [0, 0, 0],
      colors: [0xffffff],
      faces: [],
      morphTargets: [
        { name: 'anim_000', vertices: [0, 0, 0] },
        { name: 'anim_001', vertices: [10, 0, 0] },
      ],
      materials: [{ colorDiffuse: [1, 1, 1], opacity: 1 }],
    };
    const { geometry } = loader.parse(json, '');

    const material = new THREE.PointsMaterial({ color: 0xffffff, opacity: 1 });
    const pointset = new Pointset();
    pointset.createMesh(geometry, material, { localTimeEnabled: true, localMorphColour: false });
    pointset.duration = 10;

    const mesh = pointset.getMorph();
    const instancePosition = mesh.geometry.getAttribute('instancePosition');

    pointset.setMorphTime(1); // 10% through the duration.
    expect(instancePosition.getX(0), 'point had not started morphing 10% into the duration').toBeCloseTo(1, 5);

    pointset.setMorphTime(5); // halfway through the duration.
    expect(instancePosition.getX(0)).toBeCloseTo(5, 5);
  });

  it('tubeLines reads vertices from a JSONLoader BufferGeometry', () => {
    //TubeLines bypasses toBufferGeometry() and consumes the loader's
    //geometry directly (see sceneLoader.js's linesloader), so it must read
    //vertices off the BufferGeometry position attribute rather than the
    //legacy Geometry's .vertices array (which no longer exists).
    const loader = new JSONLoader();
    const json = {
      metadata: { formatVersion: 3 },
      vertices: [0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0],
      faces: [0, 0, 1, 2, 0, 2, 3, 0],
      materials: [{ colorDiffuse: [1, 1, 1], opacity: 1 }],
    };
    const { geometry, materials } = loader.parse(json, '');

    const tubeLines = new TubeLines();
    const material = new THREE.LineBasicMaterial({ color: materials[0].color.clone() });
    expect(() => tubeLines.createLineSegment(geometry, material, {
      localTimeEnabled: false,
      localMorphColour: false,
    })).not.toThrow();

    const mesh = tubeLines.getMorph();
    expect(mesh.geometry.getAttribute('position').count).toBeGreaterThan(0);

    expect(() => tubeLines.setTubeLines(2, 6)).not.toThrow();
    expect(mesh.geometry.getAttribute('position').count).toBeGreaterThan(0);
  });
});
