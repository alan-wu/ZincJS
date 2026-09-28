import * as THREE from 'three/webgpu';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { JSONLoader } from '../src/loaders/JSONLoader';
import { PrimitivesLoader } from '../src/loaders/primitivesLoader';
import { Geometry } from '../src/primitives/geometry';
import { Region } from '../src/region';
import { updateMorphColorAttribute } from '../src/utilities';

const bit = (...positions) => positions.reduce((v, p) => v | (1 << p), 0);

const createMorphColourGeometry = (localTimeEnabled = false) => {
  const loader = new JSONLoader();
  const json = {
    metadata: { formatVersion: 3 },
    vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
    colors: [0xff0000, 0x00ff00, 0x0000ff],
    faces: [bit(), 0, 1, 2],
    morphColors: [
      { name: 'anim000001', colors: [1, 0, 0, 0, 1, 0, 0, 0, 1] },
      { name: 'anim000002', colors: [0, 0, 1, 1, 0, 0, 0, 1, 0] },
      { name: 'anim000003', colors: [0, 1, 0, 0, 0, 1, 1, 0, 0] },
    ],
    materials: [{ colorDiffuse: [1, 1, 1], opacity: 1 }],
  };
  const { geometry } = loader.parse(json, '');
  const zincGeometry = new Geometry();
  zincGeometry.createMesh(geometry, undefined, {
    localTimeEnabled,
    localMorphColour: true,
    colour: 0xffffff,
    opacity: 1,
  });
  return zincGeometry;
};

describe('morph colour upload caching', () => {
  it('only re-uploads morphColor0/1 when the keyframe pair changes', () => {
    const morph = createMorphColourGeometry().getMorph();
    const geometry = morph.geometry;
    const influences = morph.morphTargetInfluences;
    influences.fill(0);
    influences[0] = 0.7;
    influences[1] = 0.3;
    updateMorphColorAttribute(geometry, morph);
    const attribute0 = geometry.getAttribute('morphColor0');
    const attribute1 = geometry.getAttribute('morphColor1');
    const version0 = attribute0.version;
    const version1 = attribute1.version;
    const mix = morph.material.userData.uniforms.morphColorMix;
    expect(mix.value).toBeCloseTo(0.3);

    //Same pair, only the blend changes: no upload
    influences[0] = 0.4;
    influences[1] = 0.6;
    updateMorphColorAttribute(geometry, morph);
    expect(attribute0.version).toBe(version0);
    expect(attribute1.version).toBe(version1);
    expect(mix.value).toBeCloseTo(0.6);

    //Next pair: both attributes change
    influences.fill(0);
    influences[1] = 0.5;
    influences[2] = 0.5;
    updateMorphColorAttribute(geometry, morph);
    expect(attribute0.version).toBeGreaterThan(version0);
    expect(attribute1.version).toBeGreaterThan(version1);
    expect(Array.from(attribute0.array)).toEqual(
      Array.from(geometry.morphAttributes.color[1].array));
    expect(Array.from(attribute1.array)).toEqual(
      Array.from(geometry.morphAttributes.color[2].array));
  });

  it('colour only playback does not invalidate the bounding box', () => {
    const zincGeometry = createMorphColourGeometry();
    zincGeometry.setDuration(0.3);
    zincGeometry.getBoundingBox();
    expect(zincGeometry.boundingBoxUpdateRequired).toBe(false);
    zincGeometry.render(0.05, true);
    expect(zincGeometry.boundingBoxUpdateRequired).toBe(false);
    zincGeometry.setMorphTime(0.1);
    expect(zincGeometry.boundingBoxUpdateRequired).toBe(false);
  });
});

describe('vertex morph playback', () => {
  it('still invalidates the bounding box', () => {
    const { geometry } = new JSONLoader().parse({
      metadata: { formatVersion: 3 },
      vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
      faces: [bit(), 0, 1, 2],
      morphTargets: [
        { name: 'anim000001', vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0] },
        { name: 'anim000002', vertices: [0, 0, 0, 2, 0, 0, 2, 2, 0] },
      ],
      materials: [{ colorDiffuse: [1, 1, 1], opacity: 1 }],
    }, '');
    const zincGeometry = new Geometry();
    zincGeometry.createMesh(geometry, undefined, {
      localTimeEnabled: true,
      localMorphColour: false,
      colour: 0xffffff,
      opacity: 1,
    });
    zincGeometry.setDuration(0.2);
    zincGeometry.getBoundingBox();
    expect(zincGeometry.boundingBoxUpdateRequired).toBe(false);
    zincGeometry.render(0.05, true);
    expect(zincGeometry.boundingBoxUpdateRequired).toBe(true);
  });
});

describe('ZincObject.getClosestVertexIndex', () => {
  it('can return the first vertex', () => {
    const geometry = new THREE.BufferGeometry();
    //Vertex 0 sits at the centre of the bounding box
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(
      [0, 0, 0, -1, -1, 0, 1, 1, 0], 3));
    const zincGeometry = new Geometry();
    zincGeometry.createMesh(geometry, undefined, {
      localTimeEnabled: false,
      localMorphColour: false,
      colour: 0xffffff,
      opacity: 1,
    });
    expect(zincGeometry.getClosestVertexIndex()).toBe(0);
  });
});

describe('Region pickable flag', () => {
  it('is cleared for hidden regions so the pickable list is not rebuilt every pick', () => {
    const root = new Region(undefined, undefined);
    const child = root.createChild('hidden');
    const grandChild = child.createChild('nested');
    child.setVisibility(false);
    root.getPickableThreeJSObjects([], true);
    expect(root.checkPickableUpdateRequred(true)).toBe(false);
    expect(grandChild.pickableUpdateRequired).toBe(false);
    //Showing the region again requests a rebuild
    child.setVisibility(true);
    expect(root.checkPickableUpdateRequred(true)).toBe(true);
  });
});

describe('PrimitivesLoader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const failAllDownloads = () => {
    vi.spyOn(THREE.FileLoader.prototype, 'load').mockImplementation(
      function (url, onLoad, onProgress, onError) {
        queueMicrotask(() => onError({ responseURL: url }));
      });
  };

  it('reports indexed download failures and frees the download slots', async () => {
    failAllDownloads();
    const loader = new PrimitivesLoader();
    const onLoad = vi.fn();
    const onError = vi.fn();
    //More than the 20 concurrent downloads allowed
    for (let i = 0; i < 25; i++) {
      loader.load(`indexed_${i}.json`, onLoad, undefined, onError, { index: 0 });
    }
    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(25));
    expect(onLoad).not.toHaveBeenCalled();
  });

  it('reports a failure once when loading from multiple sources', async () => {
    failAllDownloads();
    const loader = new PrimitivesLoader();
    const onLoad = vi.fn();
    const onError = vi.fn();
    loader.load(['a.json', 'b.json'], onLoad, undefined, onError, {});
    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onLoad).not.toHaveBeenCalled();
  });

  it('parses inline primitives', () => {
    const loader = new PrimitivesLoader();
    const object = loader.parse({
      metadata: { formatVersion: 3 },
      vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
      faces: [bit(), 0, 1, 2],
    });
    expect(object.geometry.getAttribute('position').count).toBe(3);
  });
});
