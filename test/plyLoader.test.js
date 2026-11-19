import * as THREE from 'three/webgpu';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PLYLoader } from '../src/loaders/PLYLoader';
import { Region } from '../src/region';
import { SceneLoader } from '../src/sceneLoader';
import { Geometry } from '../src/primitives/geometry';
import { Pointset } from '../src/primitives/pointset';

//Two coloured triangles sharing an edge, no normals.
const MESH_PLY = `ply
format ascii 1.0
element vertex 4
property float x
property float y
property float z
property uchar red
property uchar green
property uchar blue
element face 2
property list uchar int vertex_indices
end_header
0 0 0 255 0 0
1 0 0 0 255 0
1 1 0 0 0 255
0 1 0 255 255 255
3 0 1 2
3 0 2 3
`;

//Vertices only - a point cloud.
const POINTS_PLY = `ply
format ascii 1.0
element vertex 3
property float x
property float y
property float z
property uchar red
property uchar green
property uchar blue
end_header
0 0 0 255 0 0
1 0 0 0 255 0
2 0 0 0 0 255
`;

const createFakeScene = () => ({
  resetMetadata: vi.fn(),
  resetDuration: vi.fn(),
  setupMultipleViews: vi.fn(),
  resetView: vi.fn(),
  viewAll: vi.fn(),
  getZincCameraControls: () => undefined,
  getDuration: () => 3000,
});

//Serve PLY text through FileLoader as an arraybuffer, as PLYLoader requests.
const serve = (files) =>
  vi
    .spyOn(THREE.FileLoader.prototype, 'load')
    .mockImplementation(function (url, onLoad, onProgress, onError) {
      setTimeout(() => {
        if (url in files) onLoad(new TextEncoder().encode(files[url]).buffer);
        else onError({ responseURL: url });
      }, 0);
    });

describe('PLY support', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('PLYLoader parses faces and colours into an indexed BufferGeometry', () => {
    const geometry = new PLYLoader().parse(MESH_PLY);
    expect(geometry.getAttribute('position').count).toBe(4);
    expect(geometry.index.count).toBe(6);
    expect(geometry.hasAttribute('color')).toBe(true);
  });

  it('PLYLoader parses a vertex only file without an index', () => {
    const geometry = new PLYLoader().parse(POINTS_PLY);
    expect(geometry.getAttribute('position').count).toBe(3);
    expect(geometry.index).toBeNull();
  });

  it('loadPLY presents a file with faces as a geometry with vertex colours', async () => {
    serve({ 'mesh.ply': MESH_PLY });
    const loader = new SceneLoader(createFakeScene());
    const region = new Region(undefined, undefined);
    const finished = vi.fn();
    loader.loadPLY(region, 'mesh.ply', 'mesh', finished);
    await vi.waitFor(() => expect(finished).toHaveBeenCalled());
    const zincObject = finished.mock.calls[0][0];
    expect(zincObject).toBeInstanceOf(Geometry);
    expect(zincObject.groupName).toBe('mesh');
    const morph = zincObject.getMorph();
    expect(morph.geometry.getAttribute('position').count).toBe(4);
    expect(morph.geometry.index.count).toBe(6);
    expect(morph.geometry.hasAttribute('normal')).toBe(true);
    expect(morph.material.vertexColors).toBe(true);
    const color = morph.geometry.getAttribute('color');
    expect(color.array).toBeInstanceOf(Float32Array);
    expect(color.getX(0)).toBeCloseTo(1);
    expect(color.getY(0)).toBeCloseTo(0);
    expect(region.getAllObjects()).toContain(zincObject);
    expect(loader.toBeDownloaded).toBe(0);
  });

  it('loadPLY presents a vertex only file as a pointset', async () => {
    serve({ 'points.ply': POINTS_PLY });
    const loader = new SceneLoader(createFakeScene());
    const region = new Region(undefined, undefined);
    const finished = vi.fn();
    loader.loadPLY(region, 'points.ply', 'points', finished);
    await vi.waitFor(() => expect(finished).toHaveBeenCalled());
    const zincObject = finished.mock.calls[0][0];
    expect(zincObject).toBeInstanceOf(Pointset);
    const mesh = zincObject.getMorph();
    expect(mesh.instanceColor).toBeDefined();
    expect(mesh.instanceColor.getX(0)).toBeCloseTo(1);
    expect(mesh.instanceColor.getY(0)).toBeCloseTo(0);
    expect(loader.toBeDownloaded).toBe(0);
  });

  it('metadata FileFormat PLY loads surfaces and points', async () => {
    serve({ 'http://localhost/mesh.ply': MESH_PLY, 'http://localhost/points.ply': POINTS_PLY });
    const metadata = [
      { Type: 'Surfaces', URL: 'mesh.ply', FileFormat: 'PLY', GroupName: 'mesh' },
      //Points type forces a pointset even when faces are present
      { Type: 'Points', URL: 'mesh.ply', FileFormat: 'PLY', GroupName: 'meshPoints' },
      { Type: 'Points', URL: 'points.ply', FileFormat: 'PLY', GroupName: 'points' },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          url: 'http://localhost/data.json',
          json: () => Promise.resolve(metadata),
        }),
      ),
    );
    const loader = new SceneLoader(createFakeScene());
    const region = new Region(undefined, undefined);
    const finished = vi.fn();
    const allCompleted = vi.fn();
    loader.loadMetadataURL(region, 'http://localhost/data.json', finished, allCompleted);
    await vi.waitFor(() => expect(allCompleted).toHaveBeenCalled());
    vi.unstubAllGlobals();
    const byName = Object.fromEntries(finished.mock.calls.map(([o]) => [o.groupName, o]));
    expect(byName.mesh).toBeInstanceOf(Geometry);
    expect(byName.meshPoints).toBeInstanceOf(Pointset);
    expect(byName.points).toBeInstanceOf(Pointset);
    expect(loader.toBeDownloaded).toBe(0);
  });
});
