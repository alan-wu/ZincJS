import Zinc from '../src/zinc';
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { create as createGPU, globals as gpuGlobals } from 'webgpu';
import { JSONLoader } from '../src/loaders/JSONLoader';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { SceneLoader } from '../src/sceneLoader';

const container = document.querySelector('#container');
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

const BASE = 'http://localhost/';
const TRIANGLE = {
  metadata: { formatVersion: 3 },
  vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
  faces: [bit(), 0, 1, 2],
  materials: [{ colorDiffuse: [1, 1, 1], opacity: 1 }],
};
const view = (near, far, eye, target, up) => ({
  nearPlane: near,
  farPlane: far,
  eyePosition: eye,
  targetPosition: target,
  upVector: up,
});
const METADATA_VIEW = view(1, 100, [20, 0, 0], [0, 0, 0], [0, 1, 0]);
const SAVED_VIEW = view(2, 60, [0, -15, 0], [0, 0, 0], [0, 0, 1]);
const CURRENT_VIEW = view(0.5, 80, [3, -9, 4], [1, 0.5, 0], [0, 0, 1]);

const expectView = (actual, expected) => {
  expect(actual.nearPlane).toBeCloseTo(expected.nearPlane, 4);
  expect(actual.farPlane).toBeCloseTo(expected.farPlane, 2);
  ['eyePosition', 'targetPosition', 'upVector'].forEach((key) =>
    expected[key].forEach((value, i) => expect(actual[key][i]).toBeCloseTo(value, 4)),
  );
};

//glTF files are metadata items of type glTF, each file may contain many
//regions and zinc objects.
describe('glTF in metadata', () => {
  let renderer, zincGLB, viewsGLB, plainGLB;

  //Serve the binary files through FileLoader, as GLTFLoader requests them
  const serveFiles = (files) =>
    vi
      .spyOn(Zinc.THREE.FileLoader.prototype, 'load')
      .mockImplementation(function (url, onLoad, onProgress, onError) {
        const fullURL = (this.path || '') + url;
        setTimeout(() => {
          if (fullURL in files) onLoad(files[fullURL].slice(0));
          else onError(new Error(`Not found: ${fullURL}`));
        }, 0);
      });

  //Serve the json files through fetch, as the metadata and views are requested
  const serveJSON = (files) =>
    vi.stubGlobal(
      'fetch',
      vi.fn((url) =>
        url in files
          ? Promise.resolve({ ok: true, url, json: () => Promise.resolve(files[url]) })
          : Promise.resolve({ ok: false, status: 404, url }),
      ),
    );

  const createTarget = (name) => {
    const scene = renderer.createScene(name);
    //Keep the planes of the views as they are
    scene.getZincCameraControls().autoClippingPlanes = false;
    return { scene, loader: new SceneLoader(scene) };
  };

  //Load metadata into a new scene and wait for it to complete
  const loadMetadata = async (name, metadata, files, jsonFiles = {}) => {
    serveFiles(files);
    serveJSON({ [BASE + 'data.json']: metadata, ...jsonFiles });
    const { scene, loader } = createTarget(name);
    const viewAll = vi.spyOn(scene, 'viewAll');
    const finished = vi.fn();
    const allCompleted = vi.fn();
    loader.loadMetadataURL(scene.getRootRegion(), BASE + 'data.json', finished, allCompleted);
    await vi.waitFor(() => expect(allCompleted).toHaveBeenCalled());
    //Anything arriving late would be a second completion
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { scene, loader, finished, allCompleted, viewAll };
  };

  beforeAll(async () => {
    renderer = new Zinc.Renderer(container, window);
    Object.assign(globalThis, gpuGlobals);
    const gpu = createGPU([]);
    navigator.gpu = gpu;
    const adapter = await gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const context = createFakeCanvasContext(device, 1, 1);
    await renderer.initialiseVisualisation({ device, context });

    //Exported by zinc - regions a and a/b with three objects
    const build = (name) => {
      const scene = renderer.createScene(name);
      scene.getZincCameraControls().autoClippingPlanes = false;
      const root = scene.getRootRegion();
      const add = (region, groupName) => {
        const zincGeometry = createGeometry(false);
        zincGeometry.setName(groupName);
        region.addZincObject(zincGeometry);
      };
      add(root, 'rootTriangle');
      add(root.findOrCreateChildFromPath('a'), 'aTriangle');
      add(root.findOrCreateChildFromPath('a/b'), 'bTriangle');
      return scene;
    };
    zincGLB = await build('metadataSource').exportGLTF(true);
    const withViews = build('metadataViewsSource');
    withViews.setupMultipleViews('saved', { saved: SAVED_VIEW });
    withViews.getZincCameraControls().setCurrentCameraSettings(CURRENT_VIEW);
    viewsGLB = await withViews.exportGLTF(true);

    //From other software - a mesh without any view
    const THREE = Zinc.THREE;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 4, 0, 0, 0, 4, 0], 3),
    );
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = 'plain';
    plainGLB = await new GLTFExporter().parseAsync(mesh, { binary: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    renderer.dispose();
  });

  it('loads the regions and objects of a glTF item', async () => {
    const { scene, loader, finished, allCompleted } = await loadMetadata(
      'gltfItem',
      [{ Type: 'glTF', URL: 'model.glb' }],
      { [BASE + 'model.glb']: zincGLB },
    );
    expect(allCompleted).toHaveBeenCalledTimes(1);
    //Each object in the file is passed on
    const names = finished.mock.calls.map(([zincObject]) => zincObject.groupName).sort();
    expect(names).toEqual(['aTriangle', 'bTriangle', 'rootTriangle']);
    finished.mock.calls.forEach(([zincObject]) => expect(zincObject.isGeometry).toBe(true));
    const root = scene.getRootRegion();
    expect(
      root
        .getChildRegions(true)
        .map((region) => region.getFullPath())
        .sort(),
    ).toEqual(['a', 'a/b']);
    expect(root.findChildFromPath('a/b').findObjectsWithGroupName('bTriangle').length).toBe(1);
    expect(loader.toBeDownloaded).toBe(0);
  });

  it('counts a glTF file as one download with other items', async () => {
    const { scene, finished, allCompleted } = await loadMetadata(
      'gltfWithSurfaces',
      [
        { Type: 'glTF', URL: 'model.glb' },
        { Type: 'Surfaces', Inline: { URL: TRIANGLE }, GroupName: 'inline' },
        { Type: 'glTF', URL: 'plain.glb' },
      ],
      { [BASE + 'model.glb']: zincGLB, [BASE + 'plain.glb']: plainGLB },
    );
    //Three objects in the first file, one inline and one in the last file -
    //completed once, after all of them
    expect(allCompleted).toHaveBeenCalledTimes(1);
    expect(finished).toHaveBeenCalledTimes(5);
    expect(allCompleted.mock.invocationCallOrder[0]).toBeGreaterThan(
      Math.max(...finished.mock.invocationCallOrder),
    );
    expect(scene.getRootRegion().getAllObjects(true).length).toBe(5);
  });

  it('loads a glTF item into the region of the metadata', async () => {
    const versionOne = await loadMetadata(
      'gltfRegionPath',
      [{ Type: 'glTF', URL: 'model.glb', RegionPath: 'organ/part' }],
      { [BASE + 'model.glb']: zincGLB },
    );
    const part = versionOne.scene.getRootRegion().findChildFromPath('organ/part');
    expect(part.findObjectsWithGroupName('rootTriangle').length).toBe(1);
    expect(part.findChildFromPath('a/b').findObjectsWithGroupName('bTriangle').length).toBe(1);
    expect(versionOne.scene.getRootRegion().getAllObjects(false).length).toBe(0);

    const versionTwo = await loadMetadata(
      'gltfRegions',
      {
        Version: '2.0',
        Regions: {
          Children: { organ: { Primitives: [{ Type: 'glTF', URL: 'model.glb' }] } },
        },
      },
      { [BASE + 'model.glb']: zincGLB },
    );
    expect(versionTwo.allCompleted).toHaveBeenCalledTimes(1);
    const organ = versionTwo.scene.getRootRegion().findChildFromPath('organ');
    expect(organ.findObjectsWithGroupName('rootTriangle').length).toBe(1);
    expect(organ.findChildFromPath('a').findObjectsWithGroupName('aTriangle').length).toBe(1);
  });

  it('uses the view of the metadata over the views in the glTF file', async () => {
    const { scene, viewAll } = await loadMetadata(
      'gltfMetadataView',
      [
        { Type: 'glTF', URL: 'views.glb' },
        { Type: 'View', URL: 'view.json' },
      ],
      { [BASE + 'views.glb']: viewsGLB },
      { [BASE + 'view.json']: METADATA_VIEW },
    );
    const controls = scene.getZincCameraControls();
    expect(controls.getDefaultViewport()).toBe('default');
    expectView(controls.getViewportOfName('default'), METADATA_VIEW);
    expectView(controls.getCurrentViewport(), METADATA_VIEW);
    //The views in the file are left out
    expect(controls.getViewportOfName('saved')).toBeUndefined();
    expect(Object.keys(scene.getViews().Entries)).toEqual(['default']);
    expect(viewAll).not.toHaveBeenCalled();
  });

  it('uses the views in the glTF file when the metadata has none', async () => {
    const { scene, viewAll } = await loadMetadata(
      'gltfSavedViews',
      [
        { Type: 'glTF', URL: 'views.glb' },
        { Type: 'Surfaces', Inline: { URL: TRIANGLE }, GroupName: 'inline' },
      ],
      { [BASE + 'views.glb']: viewsGLB },
    );
    const controls = scene.getZincCameraControls();
    expect(controls.getDefaultViewport()).toBe('saved');
    expectView(controls.getViewportOfName('saved'), SAVED_VIEW);
    //The viewport when it was exported, not overridden by view all
    expectView(controls.getCurrentViewport(), CURRENT_VIEW);
    expect(viewAll).not.toHaveBeenCalled();
  });

  it('views all once at the end without any view', async () => {
    serveFiles({ [BASE + 'plain.glb']: plainGLB });
    serveJSON({ [BASE + 'data.json']: [{ Type: 'glTF', URL: 'plain.glb' }] });
    const { scene, loader } = createTarget('gltfNoViews');
    const controls = scene.getZincCameraControls();
    const defaultViewport = controls.getViewportOfName('default');
    const viewAll = vi.spyOn(scene, 'viewAll');
    const allCompleted = vi.fn(() => {
      //View all has happened once everything is loaded
      expect(viewAll).toHaveBeenCalledTimes(1);
    });
    loader.loadMetadataURL(scene.getRootRegion(), BASE + 'data.json', undefined, allCompleted);
    await vi.waitFor(() => expect(allCompleted).toHaveBeenCalled());
    expect(viewAll).toHaveBeenCalledTimes(1);
    //The file does not replace the default viewport of the scene
    expect(controls.getViewportOfName('default')).toBe(defaultViewport);
    expect(scene.getViews()).toBeUndefined();
  });

  it('reports a glTF file which can not be loaded', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { scene, loader, finished, allCompleted } = await loadMetadata(
      'gltfMissing',
      [
        { Type: 'glTF', URL: 'missing.glb' },
        { Type: 'glTF', URL: 'model.glb' },
      ],
      { [BASE + 'model.glb']: zincGLB },
    );
    expect(error).toHaveBeenCalled();
    expect(allCompleted).toHaveBeenCalledTimes(1);
    const errors = finished.mock.calls.filter(([payload]) => payload.type === 'Error');
    expect(errors.length).toBe(1);
    expect(errors[0][0].error).toBeDefined();
    //The other file is still loaded
    expect(scene.getRootRegion().getAllObjects(true).length).toBe(3);
    expect(loader.toBeDownloaded).toBe(0);
  });

  it('still sets the view when a glTF file is loaded directly', async () => {
    serveFiles({ [BASE + 'views.glb']: viewsGLB, [BASE + 'plain.glb']: plainGLB });
    const saved = createTarget('gltfDirectViews');
    const finished = vi.fn();
    const completed = vi.fn();
    saved.loader.loadGLTF(saved.scene.getRootRegion(), BASE + 'views.glb', finished, completed);
    expect(saved.loader.toBeDownloaded).toBe(1);
    await vi.waitFor(() => expect(completed).toHaveBeenCalled());
    expect(saved.loader.toBeDownloaded).toBe(0);
    expect(finished).toHaveBeenCalledTimes(3);
    //The objects are in the file, not files of their own
    finished.mock.calls.forEach(([zincObject, options]) => {
      expect(zincObject.isGeometry).toBe(true);
      expect(options).toEqual({ inlineObject: true });
    });
    const controls = saved.scene.getZincCameraControls();
    expect(controls.getDefaultViewport()).toBe('saved');
    expectView(controls.getCurrentViewport(), CURRENT_VIEW);

    //Without any view in the file, view all and keep it as the default
    const plain = createTarget('gltfDirectPlain');
    const viewAll = vi.spyOn(plain.scene, 'viewAll');
    const plainCompleted = vi.fn();
    plain.loader.loadGLTF(
      plain.scene.getRootRegion(),
      BASE + 'plain.glb',
      undefined,
      plainCompleted,
    );
    await vi.waitFor(() => expect(plainCompleted).toHaveBeenCalled());
    expect(viewAll).toHaveBeenCalledTimes(1);
    const plainControls = plain.scene.getZincCameraControls();
    expectView(plainControls.getViewportOfName('default'), plainControls.getCurrentViewport());
  });
});
