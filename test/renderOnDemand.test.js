import Zinc from "../src/zinc";
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { create as createGPU, globals as gpuGlobals } from 'webgpu';
import { JSONLoader } from '../src/loaders/JSONLoader';
import { requestRenderAll } from '../src/renderRequests';

const container = document.querySelector("#container");
const bit = (...positions) => positions.reduce((v, p) => v | (1 << p), 0);

//Same headless WebGPU setup as zinc.test.js
function createFakeCanvasContext(deviceIn, width, height) {
  let texture;
  return {
    configure(descriptor) {
      if (texture) texture.destroy();
      texture = deviceIn.createTexture({
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

const createGeometry = (morphing) => {
  const json = {
    metadata: { formatVersion: 3 },
    vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
    faces: [bit(), 0, 1, 2],
    materials: [{ colorDiffuse: [1, 1, 1], opacity: 1 }],
  };
  if (morphing) {
    json.morphTargets = [
      { name: 'anim000001', vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0] },
      { name: 'anim000002', vertices: [0, 0, 0, 2, 0, 0, 2, 2, 0] },
    ];
  }
  const { geometry } = new JSONLoader().parse(json, '');
  const zincGeometry = new Zinc.Geometry();
  zincGeometry.createMesh(geometry, undefined, {
    localTimeEnabled: morphing,
    localMorphColour: false,
    colour: 0xffffff,
    opacity: 1,
  });
  return zincGeometry;
};

describe('Render on demand', () => {
  let renderer, scene, drawSpy;

  beforeAll(async () => {
    renderer = new Zinc.Renderer(container, window);
    Object.assign(globalThis, gpuGlobals);
    const gpu = createGPU([]);
    navigator.gpu = gpu;
    const adapter = await gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const context = createFakeCanvasContext(device,
      container.clientWidth || 1, container.clientHeight || 1);
    await renderer.initialiseVisualisation({ device, context });
    scene = renderer.createScene("onDemand");
    renderer.setCurrentScene(scene);
    renderer.playAnimation = false;
    drawSpy = vi.spyOn(scene, 'render');
  });

  afterAll(() => {
    renderer.dispose();
  });

  //Render a few frames and return how many of them were drawn
  const framesDrawn = (frames = 3) => {
    drawSpy.mockClear();
    for (let i = 0; i < frames; i++) {
      renderer.render();
    }
    return drawSpy.mock.calls.length;
  };

  it('draws every frame by default', () => {
    expect(renderer.isRenderOnDemand()).toBe(false);
    expect(framesDrawn()).toBe(3);
  });

  it('draws once after enabling and then stays idle', () => {
    renderer.setRenderOnDemand(true);
    expect(renderer.isRenderOnDemand()).toBe(true);
    expect(framesDrawn()).toBe(1);
    expect(framesDrawn()).toBe(0);
  });

  it('draws once after invalidate', () => {
    renderer.invalidate();
    expect(framesDrawn()).toBe(1);
    scene.invalidate();
    expect(framesDrawn()).toBe(1);
  });

  it('draws once after a resize', () => {
    renderer.onWindowResize();
    expect(framesDrawn()).toBe(1);
  });

  it('draws once after objects are added or changed', () => {
    const zincGeometry = createGeometry(false);
    scene.getRootRegion().addZincObject(zincGeometry);
    expect(framesDrawn()).toBe(1);
    zincGeometry.setColourHex(0xff0000);
    expect(framesDrawn()).toBe(1);
    zincGeometry.setVisibility(false);
    expect(framesDrawn()).toBe(1);
    scene.getRootRegion().removeZincObject(zincGeometry);
    expect(framesDrawn()).toBe(1);
  });

  it('draws once after the camera changes', () => {
    const controls = scene.getZincCameraControls();
    controls.setCurrentCameraSettings(controls.getCurrentViewport());
    expect(framesDrawn()).toBe(1);
    scene.resetView();
    expect(framesDrawn()).toBe(1);
  });

  it('draws once when a shared resource finishes loading', () => {
    requestRenderAll();
    expect(framesDrawn()).toBe(1);
  });

  it('draws every frame while downloads are pending', async () => {
    //Fail the download on a later tick
    const load = vi.spyOn(Zinc.THREE.FileLoader.prototype, 'load').mockImplementation(
      function (url, onLoad, onProgress, onError) {
        setTimeout(() => onError({ responseURL: url }), 0);
      });
    const finished = vi.fn();
    scene.loadSTL('missing.stl', 'missing', finished);
    expect(framesDrawn()).toBe(3);
    await vi.waitFor(() => expect(finished).toHaveBeenCalled());
    load.mockRestore();
    framesDrawn();
    expect(framesDrawn()).toBe(0);
  });

  it('draws every frame while a time varying scene is playing', () => {
    const zincGeometry = createGeometry(true);
    scene.getRootRegion().addZincObject(zincGeometry);
    framesDrawn();
    renderer.playAnimation = true;
    expect(framesDrawn()).toBe(3);
    renderer.playAnimation = false;
    framesDrawn();
    expect(framesDrawn()).toBe(0);
    scene.getRootRegion().removeZincObject(zincGeometry);
    framesDrawn();
  });

  it('runs pre-render callbacks every frame and post-render callbacks only when drawn', () => {
    const pre = vi.fn();
    const post = vi.fn();
    const preId = renderer.addPreRenderCallbackFunction(pre);
    const postId = renderer.addPostRenderCallbackFunction(post);
    expect(framesDrawn()).toBe(0);
    expect(pre).toHaveBeenCalledTimes(3);
    expect(post).not.toHaveBeenCalled();
    renderer.invalidate();
    framesDrawn();
    expect(post).toHaveBeenCalledTimes(1);
    renderer.removePreRenderCallbackFunction(preId);
    renderer.removePostRenderCallbackFunction(postId);
  });

  it('a pre-render callback can request a frame', () => {
    const id = renderer.addPreRenderCallbackFunction(() => renderer.invalidate());
    expect(framesDrawn()).toBe(3);
    renderer.removePreRenderCallbackFunction(id);
    expect(framesDrawn()).toBe(0);
  });

  it('draws once when display properties change', () => {
    for (const key of ['displayMarkers', 'displayMinimap', 'displayMiniAxes']) {
      const original = scene[key];
      scene[key] = !original;
      expect(framesDrawn()).toBe(1);
      scene[key] = original;
      expect(framesDrawn()).toBe(1);
    }
  });

  it('draws once when playback stops', () => {
    renderer.playAnimation = true;
    framesDrawn();
    renderer.playAnimation = false;
    expect(framesDrawn()).toBe(1);
  });

  it('only draws for minimap settings while the minimap is shown', () => {
    scene.minimapScissor.updateRequired = true;
    expect(framesDrawn()).toBe(0);
    scene.displayMinimap = true;
    //The first frame draws the minimap and clears the flag
    expect(framesDrawn()).toBe(1);
    scene.minimapScissor.updateRequired = true;
    expect(framesDrawn()).toBe(1);
    scene.displayMinimap = false;
    framesDrawn();
  });

  it('only recomputes the minimap camera when the scene or camera changes', () => {
    const zincGeometry = createGeometry(false);
    scene.getRootRegion().addZincObject(zincGeometry);
    const controls = scene.getZincCameraControls();
    const viewport = vi.spyOn(controls, 'getViewportFromCentreAndRadius');
    scene.displayMinimap = true;
    for (let i = 0; i < 3; i++) {
      renderer.invalidate();
      renderer.render();
    }
    expect(viewport).toHaveBeenCalledTimes(1);
    //Moving the camera requires an update
    const camera = scene.camera;
    camera.position.x += 1;
    camera.updateMatrixWorld();
    renderer.invalidate();
    renderer.render();
    expect(viewport).toHaveBeenCalledTimes(2);
    viewport.mockRestore();
    scene.displayMinimap = false;
    scene.getRootRegion().removeZincObject(zincGeometry);
    framesDrawn();
  });

  it('additional active scenes use the current scene camera', () => {
    const additionalScene = renderer.createScene("additional");
    const zincGeometry = createGeometry(false);
    additionalScene.getRootRegion().addZincObject(zincGeometry);
    renderer.addActiveScene(additionalScene);
    const ownUpdate = vi.spyOn(additionalScene.getZincCameraControls(), 'update');
    const objectRender = vi.spyOn(zincGeometry, 'render');
    renderer.render();
    expect(ownUpdate).not.toHaveBeenCalled();
    expect(objectRender).toHaveBeenCalled();
    expect(objectRender.mock.calls[0][2]).toBe(scene.getZincCameraControls());
    renderer.removeActiveScene(additionalScene);
    framesDrawn();
  });

  it('keeps 16 bit indices when they are uploaded', async () => {
    const zincGeometry = createGeometry(false);
    const index = zincGeometry.getMorph().geometry.index;
    const values = Array.from(index.array);
    expect(index.array).toBeInstanceOf(Uint16Array);
    scene.getRootRegion().addZincObject(zincGeometry);
    renderer.invalidate();
    renderer.render();
    //WebGPURenderer would otherwise replace it with a Uint32Array copy
    const uploaded = zincGeometry.getMorph().geometry.index;
    expect(uploaded.array).toBeInstanceOf(Uint16Array);
    expect(uploaded.normalized).toBe(false);
    //Values read by raycasting and other CPU code are unchanged
    expect(values.map((v, i) => uploaded.getX(i))).toEqual(values);
    //Picking still hits the triangle
    const mesh = zincGeometry.getMorph();
    mesh.updateMatrixWorld(true);
    const raycaster = new Zinc.THREE.Raycaster(
      new Zinc.THREE.Vector3(0.75, 0.25, 10), new Zinc.THREE.Vector3(0, 0, -1));
    expect(raycaster.intersectObject(mesh, false).length).toBeGreaterThan(0);
    //GLTFExporter only accepts plain typed arrays, the export must succeed
    //and the indices stay 16 bit afterwards.
    const gltf = await scene.exportGLTF(false);
    expect(gltf.accessors.some((accessor) => accessor.componentType === 5123)).toBe(true);
    expect(uploaded.array.constructor).not.toBe(Uint16Array);
    scene.getRootRegion().removeZincObject(zincGeometry);
    framesDrawn();
  });

  it('draws every frame again once disabled', () => {
    renderer.setRenderOnDemand(false);
    expect(framesDrawn()).toBe(3);
  });
});
