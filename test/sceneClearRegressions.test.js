import * as THREE from 'three/webgpu';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Region } from '../src/region';
import { SceneLoader } from '../src/sceneLoader';
import { LOD } from '../src/primitives/lod';
import { Geometry } from '../src/primitives/geometry';
import { TextureSlides } from '../src/primitives/textureSlides';
import { TextureArray } from '../src/texture/textureArray';

//Resolve fetch manually so a load can be cancelled while it is in flight.
const deferredFetch = (body) => {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  vi.stubGlobal('fetch', vi.fn(() => promise));
  return async () => {
    resolve({ ok: true, url: 'http://localhost/data.json', json: () => Promise.resolve(body) });
    await new Promise(r => setTimeout(r, 0));
  };
};

const createFakeScene = () => ({
  resetMetadata: vi.fn(),
  resetDuration: vi.fn(),
  setupMultipleViews: vi.fn(),
  resetView: vi.fn(),
  viewAll: vi.fn(),
  getZincCameraControls: () => undefined,
  getDuration: () => 3000,
});

describe('Scene clear and pending loads', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('region clear detaches child region groups', () => {
    const root = new Region(undefined, undefined);
    const child = root.createChild('child');
    child.createChild('grandChild');
    expect(root.getGroup().children).toContain(child.getGroup());
    root.clear(true);
    expect(root.getGroup().children.length).toBe(0);
    expect(root.getChildRegions().length).toBe(0);
  });

  it('discards metadata that arrives after the loads are cancelled', async () => {
    const scene = createFakeScene();
    const loader = new SceneLoader(scene);
    const allCompleted = vi.fn();
    const resolveFetch = deferredFetch([]);
    loader.loadMetadataURL(new Region(undefined, undefined),
      'http://localhost/data.json', undefined, allCompleted);
    loader.cancelPendingLoads();
    await resolveFetch();
    expect(scene.resetMetadata).not.toHaveBeenCalled();
    expect(allCompleted).not.toHaveBeenCalled();
  });

  it('still processes metadata when nothing is cancelled', async () => {
    const scene = createFakeScene();
    const loader = new SceneLoader(scene);
    const resolveFetch = deferredFetch([]);
    loader.loadMetadataURL(new Region(undefined, undefined),
      'http://localhost/data.json');
    await resolveFetch();
    expect(scene.resetMetadata).toHaveBeenCalled();
  });

  it('discards a view that arrives after the loads are cancelled', async () => {
    const scene = createFakeScene();
    const loader = new SceneLoader(scene);
    const resolveFetch = deferredFetch({});
    loader.loadViewURL('http://localhost/view.json');
    expect(loader.toBeDownloaded).toBe(1);
    loader.cancelPendingLoads();
    expect(loader.toBeDownloaded).toBe(0);
    await resolveFetch();
    expect(scene.setupMultipleViews).not.toHaveBeenCalled();
    expect(loader.toBeDownloaded).toBe(0);
  });

  it('ignores LOD levels which arrive after dispose', () => {
    const zincGeometry = new Geometry();
    zincGeometry.isGeometry = true;
    const lod = new LOD(zincGeometry);
    lod.addLevelFromURL(undefined, 'far', 'http://localhost/far.json', 0, false);
    const distance = lod.levels[0].distance;
    lod.dispose();
    //Owning object is disposed as well, its group is gone
    zincGeometry.group = undefined;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
    const spy = vi.spyOn(geometry, 'dispose');
    expect(() => lod.lodLoader(distance)(geometry)).not.toThrow();
    expect(lod.levels[0].loaded).toBe(false);
    expect(spy).toHaveBeenCalled();
  });

  it('disposes the marker of a zinc object', () => {
    const zincGeometry = new Geometry();
    const marker = { dispose: vi.fn() };
    zincGeometry.marker = marker;
    zincGeometry.dispose();
    expect(marker.dispose).toHaveBeenCalled();
    expect(zincGeometry.marker).toBeUndefined();
  });

  it('disposes the textures of a texture primitive', () => {
    const slides = new TextureSlides();
    const textures = [new TextureArray(), new TextureArray()];
    const spies = textures.map(texture => {
      texture.impl = new THREE.Data3DTexture(new Uint8Array(4), 1, 1, 1);
      return vi.spyOn(texture.impl, 'dispose');
    });
    slides.texture = textures[0];
    slides.addTextureArray(textures[1]);
    slides.dispose();
    spies.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
    textures.forEach(texture => expect(texture.impl).toBeUndefined());
    expect(slides.texture).toBeUndefined();
  });
});
