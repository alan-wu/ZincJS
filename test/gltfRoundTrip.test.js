import Zinc from '../src/zinc';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { create as createGPU, globals as gpuGlobals } from 'webgpu';
import { JSONLoader } from '../src/loaders/JSONLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { GLTFToZincJSLoader } from '../src/loaders/GLTFToZincJSLoader';
import { Glyphset } from '../src/primitives/glyphset';
import { setGlyphComputeSupported } from '../src/tsl/glyphTransform';
import glyphsetData from './models/timeGlyphs_metadata.json';
import glyphGeometry from './models/timeGlyphs_geometry.json';
import { validateBytes } from 'gltf-validator';

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

//Validate with the Khronos glTF validator, gltf is the json object or GLB.
//Infos are expected - the validator does not support EXT_mesh_gpu_instancing
//and the accessors of glyphset data are only referenced from extras.
const expectValidGLTF = async (gltf) => {
  const bytes =
    gltf instanceof ArrayBuffer
      ? new Uint8Array(gltf)
      : new TextEncoder().encode(JSON.stringify(gltf));
  const report = await validateBytes(bytes, { maxIssues: 0 });
  const problems = report.issues.messages
    .filter((message) => message.severity < 2)
    .map((message) => `${message.code} ${message.pointer}: ${message.message}`);
  expect(problems).toEqual([]);
};

//A glyphset with count glyphs moving and growing along y over the steps
const createLargeGlyphsetData = (count, steps) => {
  const frames = (setValue) => {
    const result = {};
    for (let t = 0; t < steps; t++) {
      const array = new Array(count * 3);
      for (let i = 0; i < count; i++) setValue(array, i, t);
      result[t.toString()] = array;
    }
    return result;
  };
  const set = (array, i, x, y, z) => {
    array[i * 3] = x;
    array[i * 3 + 1] = y;
    array[i * 3 + 2] = z;
  };
  const colors = {};
  for (let t = 0; t < steps; t++) {
    colors[t.toString()] = Array.from({ length: count }, (_, i) => (i % 7) * 0x202020);
  }
  return {
    metadata: {
      ...glyphsetData.metadata,
      number_of_vertices: count,
      number_of_time_steps: steps,
    },
    positions: frames((a, i, t) => set(a, i, i % 100, Math.floor(i / 100) + t, 0)),
    axis1: frames((a, i) => set(a, i, 1, 0, 0)),
    axis2: frames((a, i) => set(a, i, 0, 1, 0)),
    axis3: frames((a, i) => set(a, i, 0, 0, 1)),
    scale: frames((a, i, t) => set(a, i, 1 + t, 1, 1)),
    colors,
    label: Array.from({ length: count }, (_, i) => `g${i}`),
  };
};

const findObject = (region, groupName) => region.findObjectsWithGroupName(groupName, false)[0];

const expectBoxesClose = (a, b) => {
  expect(a).toBeDefined();
  expect(b).toBeDefined();
  a.min.toArray().forEach((v, i) => expect(b.min.toArray()[i]).toBeCloseTo(v, 5));
  a.max.toArray().forEach((v, i) => expect(b.max.toArray()[i]).toBeCloseTo(v, 5));
};

describe('glTF export and load', () => {
  let renderer, source, gltf, warn, loaded, heartGroupChildren;

  beforeAll(async () => {
    renderer = new Zinc.Renderer(container, window);
    Object.assign(globalThis, gpuGlobals);
    const gpu = createGPU([]);
    navigator.gpu = gpu;
    const adapter = await gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const context = createFakeCanvasContext(device, 1, 1);
    await renderer.initialiseVisualisation({ device, context });
    source = renderer.createScene('source');
    renderer.setCurrentScene(source);
    renderer.playAnimation = false;

    const root = source.getRootRegion();
    const b = root.findOrCreateChildFromPath('a/b');
    b.setTransformation([1, 0, 0, 5, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    const spaced = root.createChild('my region');

    const heart = createGeometry(true);
    heart.setName('heart');
    heart.setAnatomicalId('UBERON:0000948');
    heart.setDuration(1234);
    b.addZincObject(heart);
    heart.setMarkerMode('on');

    const transparent = createGeometry(false);
    transparent.setName('transparent');
    spaced.addZincObject(transparent);
    transparent.setAlpha(0.5);

    const hidden = createGeometry(false);
    hidden.setName('hidden');
    root.addZincObject(hidden);
    hidden.setVisibility(false);

    b.createLines(
      'lines',
      [
        [0, 0, 0],
        [1, 1, 1],
        [1, 1, 1],
        [2, 0, 0],
      ],
      0xff0000,
    );
    root.createPoints(
      'pts',
      [
        [0, 0, 0],
        [1, 0, 0],
        [0, 2, 0],
      ],
      undefined,
      0x00ff00,
    );

    source.enableMarkerCluster(true);
    renderer.render();
    renderer.render();
    heartGroupChildren = [...heart.getGroup().children];

    warn = vi.spyOn(console, 'warn');
    gltf = await source.exportGLTF(false);
    const glb = await source.exportGLTF(true);
    await expectValidGLTF(gltf);
    await expectValidGLTF(glb);
    warn.mockRestore();

    const target = renderer.createScene('target');
    const parsed = await new Promise((resolve, reject) =>
      new GLTFLoader().parse(glb, '', resolve, reject),
    );
    loaded = [];
    new GLTFToZincJSLoader().parseGLTFObjects(parsed.scene, target.getRootRegion(), 0, (o) =>
      loaded.push(o),
    );
    renderer.target = target;
  });

  afterAll(() => {
    renderer.dispose();
  });

  it('exports without warnings', () => {
    const messages = warn.mock.calls.map((call) => String(call[0]));
    //The material note is expected, zinc uses Phong materials
    const unexpected = messages.filter(
      (m) => m.includes('GLTFExporter') && !m.includes('MeshStandardMaterial'),
    );
    expect(unexpected).toEqual([]);
  });

  it('writes the region and zinc object structure', () => {
    const nodes = gltf.nodes;
    const byName = (name) => nodes.find((node) => node.name === name);
    const rootNode = nodes[gltf.scenes[0].nodes[0]];
    //The root region and the camera of the current viewport
    expect(gltf.scenes[0].nodes.length).toBe(2);
    expect(rootNode.extras.zinc.type).toBe('rootRegion');
    const viewNode = nodes[gltf.scenes[0].nodes[1]];
    expect(viewNode.extras.zinc.type).toBe('view');
    expect(viewNode.camera).toBe(0);
    expect(gltf.cameras.length).toBe(1);
    //No view was provided to this scene
    expect(rootNode.extras.zinc.views).toBeUndefined();
    expect(byName('a').extras.zinc).toMatchObject({ type: 'region', name: 'a' });
    expect(byName('b').extras.zinc).toMatchObject({ type: 'region', name: 'b' });
    const bNode = byName('b');
    expect(bNode.translation ? bNode.translation[0] : bNode.matrix[12]).toBe(5);
    expect(byName('my region').extras.zinc.name).toBe('my region');
    const heartNode = nodes.find((node) => node.extras?.zinc?.groupName === 'heart');
    expect(heartNode.extras.zinc).toMatchObject({
      type: 'geometry',
      anatomicalId: 'UBERON:0000948',
      duration: 1234,
      timeEnabled: true,
    });
    expect(nodes.find((n) => n.extras?.zinc?.groupName === 'lines').extras.zinc.type).toBe('lines');
    expect(nodes.find((n) => n.extras?.zinc?.groupName === 'pts').extras.zinc.type).toBe(
      'pointset',
    );
    //Hidden objects are not exported
    expect(nodes.some((n) => n.extras?.zinc?.groupName === 'hidden')).toBe(false);
    //Every node is a region, a zinc object, its mesh or the view - no
    //markers, labels, lights or back face meshes.
    nodes.forEach((node) => {
      expect(node.extras?.zinc !== undefined || node.mesh !== undefined).toBe(true);
      if (node.mesh !== undefined) expect(node.children).toBeUndefined();
    });
    expect(gltf.meshes.length).toBe(4);
    expect(gltf.extensionsUsed ?? []).not.toContain('KHR_lights_punctual');
  });

  it('writes standard lines, points and morph targets', () => {
    const meshNodeOf = (groupName) => {
      const node = gltf.nodes.find((n) => n.extras?.zinc?.groupName === groupName);
      return gltf.nodes[node.children[0]];
    };
    const primitiveOf = (groupName) => gltf.meshes[meshNodeOf(groupName).mesh].primitives[0];
    const lines = primitiveOf('lines');
    expect(lines.mode).toBe(1);
    expect(gltf.accessors[lines.attributes.POSITION].count).toBe(4);
    const points = primitiveOf('pts');
    expect(points.mode).toBe(0);
    expect(gltf.accessors[points.attributes.POSITION].count).toBe(3);
    const heart = primitiveOf('heart');
    expect(heart.targets.length).toBe(2);
    //Normal morph targets without base normals are left out
    heart.targets.forEach((target) => expect(Object.keys(target)).toEqual(['POSITION']));
    Object.keys(heart.attributes).forEach((name) => expect(name.startsWith('_')).toBe(false));
    const heartMesh = gltf.meshes[meshNodeOf('heart').mesh];
    expect(heartMesh.weights.length).toBe(2);
    expect(gltf.animations.length).toBe(1);
    const channel = gltf.animations[0].channels[0];
    expect(channel.target.node).toBe(gltf.nodes.indexOf(meshNodeOf('heart')));
    expect(channel.target.path).toBe('weights');
  });

  it('leaves the scene unchanged', () => {
    const heart = findObject(source.getRootRegion().findChildFromPath('a/b'), 'heart');
    expect(heart.getGroup().children).toEqual(heartGroupChildren);
    expect(heart.marker).toBeDefined();
    expect(heart.getMorph().userData).toBe(heart);
    expect(source.getRootRegion().getGroup().userData).toBe(source.getRootRegion());
  });

  it('loads the regions and zinc objects back', () => {
    const sourceRoot = source.getRootRegion();
    const targetRoot = renderer.target.getRootRegion();
    expect(loaded.length).toBe(4);
    expect(
      targetRoot
        .getChildRegions(true)
        .map((r) => r.getFullPath())
        .sort(),
    ).toEqual(
      sourceRoot
        .getChildRegions(true)
        .map((r) => r.getFullPath())
        .sort(),
    );
    const b = targetRoot.findChildFromPath('a/b');
    expect(b.getGroup().matrix.elements[12]).toBe(5);
    //No extra regions for the zinc objects
    expect(b.getChildRegions(false).length).toBe(0);

    const heart = findObject(b, 'heart');
    expect(heart.isGeometry).toBe(true);
    expect(heart.anatomicalId).toBe('UBERON:0000948');
    expect(heart.getDuration()).toBe(1234);
    expect(heart.timeEnabled).toBe(true);
    expect(heart.getMorph().geometry.morphAttributes.position.length).toBe(2);
    expect(findObject(b, 'lines').isLines).toBe(true);
    expect(findObject(targetRoot.findChildFromPath('my region'), 'transparent').isGeometry).toBe(
      true,
    );
    const pts = findObject(targetRoot, 'pts');
    expect(pts.isPointset).toBe(true);
    expect(pts.getMorph().count).toBe(3);
    expect(findObject(targetRoot, 'hidden')).toBeUndefined();

    expectBoxesClose(
      findObject(sourceRoot.findChildFromPath('a/b'), 'heart').getBoundingBox(),
      heart.getBoundingBox(),
    );
    //Segments (0,0,0)-(1,1,1) and (1,1,1)-(2,0,0) translated by region b
    expectBoxesClose(
      new Zinc.THREE.Box3(new Zinc.THREE.Vector3(5, 0, 0), new Zinc.THREE.Vector3(7, 1, 1)),
      findObject(b, 'lines').getBoundingBox(),
    );
    expectBoxesClose(findObject(sourceRoot, 'pts').getBoundingBox(), pts.getBoundingBox());
  });
  //Only the positions, colours and opacity of imported points are used, the
  //pointset decides how they look, e.g. the alpha test cutting the round
  //texture out of the point squares.
  it('loads only the positions, colours and opacity of points', async () => {
    const THREE = Zinc.THREE;
    const defaultPoints = findObject(source.getRootRegion(), 'pts').getMorph().material;
    const defaultAlphaTest = defaultPoints.alphaTest;
    expect(defaultAlphaTest).toBe(0.5);
    const loadedPoints = findObject(renderer.target.getRootRegion(), 'pts');
    expect(loadedPoints.getMorph().material.alphaTest).toBe(defaultAlphaTest);
    //The look of the points in zinc is not stored
    const node = gltf.nodes.find((n) => n.extras?.zinc?.groupName === 'pts');
    expect(node.extras.zinc.alphaTest).toBeUndefined();
    const mesh = gltf.meshes[gltf.nodes[node.children[0]].mesh];
    const material = gltf.materials[mesh.primitives[0].material];
    expect(material.alphaMode).toBeUndefined();
    expect(material.alphaCutoff).toBeUndefined();

    const load = async (glb, name) => {
      const parsed = await new Promise((resolve, reject) =>
        new GLTFLoader().parse(glb, '', resolve, reject),
      );
      const target = renderer.createScene(`${name}Target`);
      await new GLTFToZincJSLoader().parseGLTF(parsed, target.getRootRegion());
      return findObject(target.getRootRegion(), name);
    };

    //Points with their own look, like the ones loaded from json
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 2, 0], 3),
    );
    const styled = new Zinc.Pointset();
    styled.createMesh(
      geometry,
      new THREE.PointsMaterial({
        alphaTest: 0.05,
        color: 0x336699,
        opacity: 0.5,
        transparent: true,
        size: 10,
        sizeAttenuation: false,
      }),
      { localTimeEnabled: false, localMorphColour: false },
    );
    styled.setName('styled');
    const scene = renderer.createScene('styledPointsSource');
    scene.getRootRegion().addZincObject(styled);
    const glb = await scene.exportGLTF(true);
    await expectValidGLTF(glb);
    const loadedStyled = await load(glb, 'styled');
    const styledMaterial = loadedStyled.getMorph().material;
    expect(styledMaterial.alphaTest).toBe(defaultAlphaTest);
    expect(styledMaterial.opacity).toBeCloseTo(0.5);
    expect(styledMaterial.transparent).toBe(true);
    ['r', 'g', 'b'].forEach((channel) =>
      expect(styledMaterial.color[channel]).toBeCloseTo(
        styled.getMorph().material.color[channel],
        5,
      ),
    );
    expect(Array.from(loadedStyled.getMorph().pointPositions.slice(0, 9))).toEqual([
      0, 0, 0, 1, 0, 0, 0, 2, 0,
    ]);

    //Points from other software
    const plain = new THREE.Points(
      geometry.clone(),
      new THREE.PointsMaterial({ size: 3, color: 0xff0000 }),
    );
    plain.name = 'plainPoints';
    const plainGLB = await new GLTFExporter().parseAsync(plain, { binary: true });
    const plainMaterial = (await load(plainGLB, 'plainPoints')).getMorph().material;
    expect(plainMaterial.alphaTest).toBe(defaultAlphaTest);
    expect(plainMaterial.size).toBe(defaultPoints.size);
    expect(plainMaterial.transparent).toBe(false);
  });

  it('loads glTF files from other software', async () => {
    const THREE = Zinc.THREE;
    //organ (named node) > unnamed node translated by 2 > triangle
    const organ = new THREE.Object3D();
    organ.name = 'organ';
    organ.position.set(0, 3, 0);
    const offset = new THREE.Object3D();
    offset.position.set(2, 0, 0);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0], 3),
    );
    const triangle = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    triangle.name = 'triangle';
    offset.add(triangle);
    organ.add(offset);
    const glb = await new GLTFExporter().parseAsync(organ, { binary: true });
    const parsed = await new Promise((resolve, reject) =>
      new GLTFLoader().parse(glb, '', resolve, reject),
    );
    const target = renderer.createScene('thirdParty');
    new GLTFToZincJSLoader().parseGLTFObjects(parsed.scene, target.getRootRegion(), 0);
    const region = target.getRootRegion().findChildFromPath('organ');
    expect(region).toBeDefined();
    expect(region.getGroup().matrix.elements[13]).toBe(3);
    const zincTriangle = findObject(region, 'triangle');
    expect(zincTriangle.isGeometry).toBe(true);
    //The unnamed node does not become a region but keeps its transformation
    expect(region.getChildRegions(false).length).toBe(0);
    target.getThreeJSScene().updateMatrixWorld(true);
    expectBoxesClose(
      new THREE.Box3(new THREE.Vector3(2, 3, 0), new THREE.Vector3(3, 4, 0)),
      zincTriangle.getBoundingBox(),
    );
  });
  it('converts line strips, line loops and indexed lines to line segments', async () => {
    const THREE = Zinc.THREE;
    const createGeometry = (values) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(values, 3));
      return geometry;
    };
    const corners = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0];
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const root = new THREE.Group();
    //Morphing line strip, the last corner moves up
    const stripGeometry = createGeometry(corners);
    stripGeometry.morphAttributes.position = [corners, [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 5]].map(
      (values) => new THREE.Float32BufferAttribute(values, 3),
    );
    const strip = new THREE.Line(stripGeometry, material);
    strip.name = 'strip';
    strip.morphTargetDictionary = { step000001: 0, step000002: 1 };
    strip.morphTargetInfluences = [0, 0];
    const loop = new THREE.LineLoop(createGeometry(corners), material);
    loop.name = 'loop';
    //Indexed line segments, the two diagonals
    const indexedGeometry = createGeometry(corners);
    indexedGeometry.setIndex([0, 2, 1, 3]);
    const indexed = new THREE.LineSegments(indexedGeometry, material);
    indexed.name = 'indexed';
    root.add(strip, loop, indexed);
    //Line segments, line loop and line strip
    const json = await new GLTFExporter().parseAsync(root);
    expect(json.meshes.map((mesh) => mesh.primitives[0].mode).sort()).toEqual([1, 2, 3]);
    const glb = await new GLTFExporter().parseAsync(root, { binary: true });
    const parsed = await new Promise((resolve, reject) =>
      new GLTFLoader().parse(glb, '', resolve, reject),
    );
    const target = renderer.createScene('lineTypesTarget');
    await new GLTFToZincJSLoader().parseGLTF(parsed, target.getRootRegion());
    const positionsOf = (name, attribute) => {
      const zincLines = findObject(target.getRootRegion(), name);
      expect(zincLines.isLines).toBe(true);
      const geometry = zincLines.getMorph().geometry;
      expect(geometry.index).toBeNull();
      return Array.from(
        (attribute ? attribute(geometry) : geometry.getAttribute('position')).array,
      );
    };
    const p = (i) => corners.slice(i * 3, i * 3 + 3);
    const segments = (...pairs) => pairs.flatMap(([a, b]) => [...p(a), ...p(b)]);
    expect(positionsOf('strip')).toEqual(segments([0, 1], [1, 2], [2, 3]));
    //The loop is closed with a segment from the last vertex to the first
    expect(positionsOf('loop')).toEqual(segments([0, 1], [1, 2], [2, 3], [3, 0]));
    expect(positionsOf('indexed')).toEqual(segments([0, 2], [1, 3]));
    //Morph targets follow the vertices and keep their names
    const stripLines = findObject(target.getRootRegion(), 'strip');
    expect(stripLines.timeEnabled).toBe(true);
    const targets = stripLines.getMorph().geometry.morphAttributes.position;
    expect(targets.map((attribute) => attribute.name)).toEqual(['step000001', 'step000002']);
    expect(Array.from(targets[1].array)).toEqual([
      0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 5,
    ]);
  });

  it('loads morphing lines back', async () => {
    const THREE = Zinc.THREE;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3));
    geometry.morphAttributes.position = [
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 3, 0, 0],
    ].map((values, i) => {
      const attribute = new THREE.Float32BufferAttribute(values, 3);
      attribute.name = 'line00000' + (i + 1);
      return attribute;
    });
    geometry.morphTargetsRelative = false;
    const lines = new Zinc.Lines();
    lines.createLineSegment(geometry, new THREE.LineBasicMaterial({ color: 0xff0000 }), {
      localTimeEnabled: true,
      localMorphColour: false,
    });
    lines.setName('morphingLines');
    const scene = renderer.createScene('morphingLinesSource');
    scene.getRootRegion().addZincObject(lines);
    const glb = await scene.exportGLTF(true);
    await expectValidGLTF(glb);
    const parsed = await new Promise((resolve, reject) =>
      new GLTFLoader().parse(glb, '', resolve, reject),
    );
    //Plays in other software - the first target at the start, blended
    //halfway and the second target at the end.
    const segments = parsed.scene.getObjectByProperty('type', 'LineSegments');
    const mixer = new THREE.AnimationMixer(parsed.scene);
    mixer.clipAction(parsed.animations[0]).play();
    [
      [0, [1, 0]],
      [0.05, [0.5, 0.5]],
      [0.1, [0, 1]],
    ].forEach(([time, weights]) => {
      mixer.setTime(time);
      weights.forEach((weight, i) =>
        expect(segments.morphTargetInfluences[i]).toBeCloseTo(weight, 5),
      );
    });
    const error = vi.spyOn(console, 'error');
    const warn = vi.spyOn(console, 'warn');
    const target = renderer.createScene('morphingLinesTarget');
    new GLTFToZincJSLoader().parseGLTFObjects(parsed.scene, target.getRootRegion(), 0);
    const loadedLines = findObject(target.getRootRegion(), 'morphingLines');
    loadedLines.setMorphTime(loadedLines.getDuration());
    const messages = [...error.mock.calls, ...warn.mock.calls].map((call) => String(call[0]));
    error.mockRestore();
    warn.mockRestore();
    expect(messages.filter((m) => m.includes('PropertyBinding'))).toEqual([]);
    expect(loadedLines.isLines).toBe(true);
    expect(loadedLines.timeEnabled).toBe(true);
    const morph = loadedLines.getMorph();
    expect(Object.keys(morph.morphTargetDictionary).length).toBe(2);
    //Fully morphed into the last target at the end of the animation
    expect(morph.morphTargetInfluences[morph.morphTargetDictionary['line000002']]).toBeCloseTo(1);
  });
  it('exports and loads time varying glyphsets with their labels', async () => {
    //CPU path so the instance matrices can be compared right away
    setGlyphComputeSupported(false);
    try {
      const labels = Array.from({ length: 8 }, (_, i) => `glyph ${i}`);
      const sourceGlyphset = new Glyphset();
      sourceGlyphset.groupName = 'glyphs';
      sourceGlyphset.load(
        { ...glyphsetData, label: labels },
        glyphGeometry,
        undefined,
        true,
        false,
      );
      sourceGlyphset.setAnatomicalId('UBERON:0002349');
      sourceGlyphset.setDuration(4321);
      const scene = renderer.createScene('glyphsetSource');
      scene.getRootRegion().findOrCreateChildFromPath('fibres').addZincObject(sourceGlyphset);

      const json = await scene.exportGLTF(false);
      await expectValidGLTF(json);
      const node = json.nodes.find((n) => n.extras?.zinc?.groupName === 'glyphs');
      const exported = node.extras.zinc.glyphset;
      expect(node.extras.zinc.type).toBe('glyphset');
      expect(exported.metadata).toEqual(glyphsetData.metadata);
      expect(exported.label).toEqual(labels);
      const steps = glyphsetData.metadata.number_of_time_steps;
      ['positions', 'axis1', 'axis2', 'axis3', 'scale', 'colors'].forEach((name) => {
        expect(Object.keys(exported[name]).length).toBe(steps);
        Object.values(exported[name]).forEach((index) => {
          expect(json.accessors[index].count).toBe(8);
          expect(json.accessors[index].type).toBe('VEC3');
        });
      });
      //Other software gets the static glyphs as an instanced mesh, only the
      //transformation and colour data for zinc is stored
      const meshNode = json.nodes[node.children[0]];
      expect(meshNode.extensions.EXT_mesh_gpu_instancing).toBeDefined();
      expect(json.meshes[meshNode.mesh].primitives[0].targets).toBeUndefined();
      expect(json.animations).toBeUndefined();
      expect(exported.glyph).toBeUndefined();

      const glb = await scene.exportGLTF(true);
      const parsed = await new Promise((resolve, reject) =>
        new GLTFLoader().parse(glb, '', resolve, reject),
      );
      const target = renderer.createScene('glyphsetTarget');
      const loader = new GLTFToZincJSLoader();
      expect(await loader.parseGLTF(parsed, target.getRootRegion())).toBe(true);
      const region = target.getRootRegion().findChildFromPath('fibres');
      const glyphset = findObject(region, 'glyphs');
      expect(glyphset.isGlyphset).toBe(true);
      expect(glyphset.ready).toBe(true);
      expect(glyphset.anatomicalId).toBe('UBERON:0002349');
      expect(glyphset.getDuration()).toBe(4321);
      expect(glyphset.isTimeVarying()).toBe(true);
      labels.forEach((label, i) => expect(glyphset.getLabel(i)).toBe(label));

      const source = sourceGlyphset.getGlyphsetData();
      const loaded = glyphset.getGlyphsetData();
      expect(loaded.metadata).toEqual(source.metadata);
      expect(loaded.colors).toEqual(source.colors);
      ['positions', 'axis1', 'axis2', 'axis3', 'scale'].forEach((name) => {
        Object.keys(source[name]).forEach((key) => {
          source[name][key].forEach((v, i) => expect(loaded[name][key][i]).toBeCloseTo(v, 5));
        });
      });

      //Same transformations and colours throughout the animation
      [0, 0.3, 0.5, 1].forEach((ratio) => {
        sourceGlyphset.setMorphTime(4321 * ratio);
        glyphset.setMorphTime(4321 * ratio);
        const expected = sourceGlyphset.getMorph().instanceMatrix.array;
        const actual = glyphset.getMorph().instanceMatrix.array;
        expected.forEach((v, i) => expect(actual[i]).toBeCloseTo(v, 5));
        const expectedColours = sourceGlyphset.getMorph().instanceColor.array;
        const actualColours = glyphset.getMorph().instanceColor.array;
        expectedColours.forEach((v, i) => expect(actualColours[i]).toBeCloseTo(v, 5));
      });
      //Without the glyphset data the instanced mesh is a geometry
      const reparsed = await new Promise((resolve, reject) =>
        new GLTFLoader().parse(glb, '', resolve, reject),
      );
      const fallback = renderer.createScene('glyphsetFallback');
      loader.parseGLTFObjects(reparsed.scene, fallback.getRootRegion(), 0);
      const geometries = fallback
        .getRootRegion()
        .findChildFromPath('fibres')
        .findObjectsWithGroupName('glyphs', false);
      expect(geometries.length).toBe(1);
      geometries.forEach((geometry) => expect(geometry.isGeometry).toBe(true));
    } finally {
      setGlyphComputeSupported(true);
    }
  });
  it('loads time varying glyphsets with the GPU compute path', async () => {
    const sourceGlyphset = new Glyphset();
    sourceGlyphset.groupName = 'gpuGlyphs';
    sourceGlyphset.load(glyphsetData, glyphGeometry, undefined, true, false);
    const scene = renderer.createScene('gpuGlyphsetSource');
    scene.getRootRegion().addZincObject(sourceGlyphset);
    renderer.setCurrentScene(scene);
    renderer.render();
    const glb = await scene.exportGLTF(true);
    await expectValidGLTF(glb);
    const parsed = await new Promise((resolve, reject) =>
      new GLTFLoader().parse(glb, '', resolve, reject),
    );
    const target = renderer.createScene('gpuGlyphsetTarget');
    await new GLTFToZincJSLoader().parseGLTF(parsed, target.getRootRegion());
    const glyphset = findObject(target.getRootRegion(), 'gpuGlyphs');
    expect(glyphset.isUsingGPUCompute()).toBe(true);
    const error = vi.spyOn(console, 'error');
    renderer.setCurrentScene(target);
    glyphset.setMorphTime(glyphset.getDuration() / 2);
    renderer.render();
    renderer.render();
    const errors = error.mock.calls.map((call) => String(call[0]));
    error.mockRestore();
    expect(errors).toEqual([]);
  });
  it('exports glyphsets without morphing vertices as an instanced mesh', async () => {
    const staticData = {
      ...glyphsetData,
      metadata: { ...glyphsetData.metadata, MorphVertices: false },
    };
    const sourceGlyphset = new Glyphset();
    sourceGlyphset.groupName = 'staticGlyphs';
    sourceGlyphset.load(staticData, glyphGeometry, undefined, true, false);
    const scene = renderer.createScene('staticGlyphsetSource');
    scene.getRootRegion().addZincObject(sourceGlyphset);
    const json = await scene.exportGLTF(false);
    await expectValidGLTF(json);
    const node = json.nodes.find((n) => n.extras?.zinc?.groupName === 'staticGlyphs');
    expect(node.extras.zinc).toMatchObject({ timeEnabled: false, morphColour: true });
    expect(node.extras.zinc.glyphset.glyph).toBeUndefined();
    const meshNode = json.nodes[node.children[0]];
    expect(meshNode.extensions.EXT_mesh_gpu_instancing).toBeDefined();
    expect(json.meshes[meshNode.mesh].primitives[0].targets).toBeUndefined();

    const glb = await scene.exportGLTF(true);
    const parsed = await new Promise((resolve, reject) =>
      new GLTFLoader().parse(glb, '', resolve, reject),
    );
    const target = renderer.createScene('staticGlyphsetTarget');
    await new GLTFToZincJSLoader().parseGLTF(parsed, target.getRootRegion());
    const glyphset = findObject(target.getRootRegion(), 'staticGlyphs');
    expect(glyphset.isGlyphset).toBe(true);
    expect(glyphset.getGlyphsetData().metadata).toEqual(staticData.metadata);
  });
  //Only the transformation and colour data of the glyphs is stored, the size
  //of the file stays close to the size of that data.
  it('exports and loads large glyphsets', async () => {
    setGlyphComputeSupported(false);
    try {
      const count = 60000;
      const steps = 3;
      const sourceGlyphset = new Glyphset();
      sourceGlyphset.groupName = 'large';
      sourceGlyphset.load(
        createLargeGlyphsetData(count, steps),
        glyphGeometry,
        undefined,
        true,
        false,
      );
      const scene = renderer.createScene('largeSource');
      scene.getRootRegion().addZincObject(sourceGlyphset);
      const glb = await scene.exportGLTF(true);
      //positions, axis1, axis2, axis3, scale and colours, 3 floats each
      const dataSize = count * steps * 6 * 3 * 4;
      expect(glb.byteLength).toBeLessThan(dataSize * 1.5);
      const parsed = await new Promise((resolve, reject) =>
        new GLTFLoader().parse(glb, '', resolve, reject),
      );
      expect(parsed.animations.length).toBe(0);
      const target = renderer.createScene('largeTarget');
      await new GLTFToZincJSLoader().parseGLTF(parsed, target.getRootRegion());
      const glyphset = findObject(target.getRootRegion(), 'large');
      expect(glyphset.isGlyphset).toBe(true);
      expect(glyphset.getGlyphsetData().metadata.number_of_vertices).toBe(count);
      expect(glyphset.getMorph().count).toBe(count);
    } finally {
      setGlyphComputeSupported(true);
    }
  }, 60000);
  describe('views', () => {
    const view = (near, far, eye, target, up) => ({
      nearPlane: near,
      farPlane: far,
      eyePosition: eye,
      targetPosition: target,
      upVector: up,
    });
    const currentView = view(0.5, 80, [3, -9, 4], [1, 0.5, 0], [0, 0, 1]);
    const metadataViews = {
      default: view(
        53.6153,
        5091.66,
        [544.477, -3008.9, 1488.21],
        [1505.66, -1308.41, -64.6189],
        [0.189787, 0.601408, 0.776073],
      ),
      side: view(1, 100, [20, 0, 0], [0, 0, 0], [0, 1, 0]),
    };
    const createScene = (name) => {
      const scene = renderer.createScene(name);
      const zincGeometry = createGeometry(false);
      zincGeometry.setName('triangle');
      scene.getRootRegion().addZincObject(zincGeometry);
      //Keep the planes of the views as they are
      scene.getZincCameraControls().autoClippingPlanes = false;
      return scene;
    };
    const parse = (data) =>
      new Promise((resolve, reject) => new GLTFLoader().parse(data, '', resolve, reject));
    const expectView = (actual, expected, digits = 4) => {
      expect(actual.nearPlane).toBeCloseTo(expected.nearPlane, digits);
      expect(actual.farPlane).toBeCloseTo(expected.farPlane, 2);
      ['eyePosition', 'targetPosition', 'upVector'].forEach((key) =>
        expected[key].forEach((value, i) => expect(actual[key][i]).toBeCloseTo(value, digits)),
      );
    };
    const load = async (glb, name, options) => {
      const parsed = await parse(glb);
      const target = renderer.createScene(name);
      target.getZincCameraControls().autoClippingPlanes = false;
      const loader = new GLTFToZincJSLoader();
      await loader.parseGLTF(parsed, target.getRootRegion());
      return { target, applied: loader.applyViews(target, parsed, options) };
    };

    it('exports the current viewport as a camera and loads it back', async () => {
      const scene = createScene('viewSource');
      scene.getZincCameraControls().setCurrentCameraSettings(currentView);
      const json = await scene.exportGLTF(false);
      await expectValidGLTF(json);
      expect(json.cameras.length).toBe(1);
      expect(json.cameras[0].type).toBe('perspective');
      const node = json.nodes.find((n) => n.camera === 0);
      expect(json.scenes[0].nodes).toContain(json.nodes.indexOf(node));
      expect(node.extras.zinc.type).toBe('view');
      expectView(node.extras.zinc, currentView);
      expect(
        json.nodes.find((n) => n.extras?.zinc?.type === 'rootRegion').extras.zinc.views,
      ).toBeUndefined();

      const { target, applied } = await load(await scene.exportGLTF(true), 'viewTarget');
      expect(applied).toBe(true);
      const controls = target.getZincCameraControls();
      expectView(controls.getCurrentViewport(), currentView);
      //Reset view returns to it
      expect(controls.getDefaultViewport()).toBe('default');
      expectView(controls.getViewportOfName('default'), currentView);
      expect(target.getViews()).toBeUndefined();
    });

    it('exports the views provided to the scene and loads them back', async () => {
      const scene = createScene('viewsSource');
      scene.setupMultipleViews('side', metadataViews);
      expect(scene.getViews()).toEqual({ Default: 'side', Entries: metadataViews });
      scene.getZincCameraControls().setCurrentCameraSettings(currentView);
      const json = await scene.exportGLTF(false);
      await expectValidGLTF(json);
      const rootNode = json.nodes.find((n) => n.extras?.zinc?.type === 'rootRegion');
      expect(rootNode.extras.zinc.views).toEqual({ Default: 'side', Entries: metadataViews });

      const { target, applied } = await load(await scene.exportGLTF(true), 'viewsTarget');
      expect(applied).toBe(true);
      const controls = target.getZincCameraControls();
      expect(controls.getDefaultViewport()).toBe('side');
      expectView(controls.getViewportOfName('side'), metadataViews.side);
      expectView(controls.getViewportOfName('default'), metadataViews.default);
      //The camera is where it was when exported
      expectView(controls.getCurrentViewport(), currentView);
      //and the views are kept for the next export
      expect(target.getViews()).toEqual(scene.getViews());
      target.clearAll();
      expect(target.getViews()).toBeUndefined();
    });

    it('keeps the current viewport when viewAll is false', async () => {
      const scene = createScene('keepViewSource');
      scene.setupMultipleViews('side', metadataViews);
      scene.getZincCameraControls().setCurrentCameraSettings(currentView);
      const glb = await scene.exportGLTF(true);
      const parsed = await parse(glb);
      const target = renderer.createScene('keepViewTarget');
      const controls = target.getZincCameraControls();
      controls.autoClippingPlanes = false;
      const before = controls.getCurrentViewport();
      const loader = new GLTFToZincJSLoader();
      await loader.parseGLTF(parsed, target.getRootRegion());
      expect(loader.applyViews(target, parsed, { viewAll: false })).toBe(true);
      expectView(controls.getCurrentViewport(), before);
      expect(controls.getDefaultViewport()).toBe('side');
    });

    it('loads the camera of files from other software', async () => {
      const THREE = Zinc.THREE;
      const root = new THREE.Group();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 0, 1, 0], 3),
      );
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
      mesh.name = 'triangle';
      root.add(mesh);
      const camera = new THREE.PerspectiveCamera(50, 1.5, 0.1, 100);
      camera.position.set(0, -10, 0);
      camera.up.set(0, 0, 1);
      camera.lookAt(0, 0, 0);
      root.add(camera);
      const glb = await new GLTFExporter().parseAsync(root, { binary: true });
      const { target, applied } = await load(glb, 'cameraTarget');
      expect(applied).toBe(true);
      //The target is on the view line at the centre of the mesh
      expectView(
        target.getZincCameraControls().getCurrentViewport(),
        view(0.1, 100, [0, -10, 0], [0, 0, 0], [0, 0, 1]),
      );
    });

    it('has no view to apply without views or cameras', async () => {
      const THREE = Zinc.THREE;
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial());
      mesh.geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
      );
      const glb = await new GLTFExporter().parseAsync(mesh, { binary: true });
      const { applied } = await load(glb, 'noViewTarget');
      expect(applied).toBe(false);
    });
  });
});
