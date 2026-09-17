import { describe, it, expect } from 'vitest';
import { JSONLoader } from '../src/loaders/JSONLoader';
import { toBufferGeometry } from '../src/utilities';

const bit = (...positions) => positions.reduce((v, p) => v | (1 << p), 0);

//loader.parse() only ever returns the legacy, pre-buffer Geometry (with
//.faces/.vertices/.colors etc, not .getAttribute()/.getIndex()/
//.morphAttributes) - production code always converts it via
//toBufferGeometry() before touching it as a BufferGeometry, so tests do
//the same here rather than asserting on the untouched parse() output.
const parseToBufferGeometry = (json, options = {}) => {
  const loader = new JSONLoader();
  const { geometry: legacyGeometry } = loader.parse(json, '');
  return toBufferGeometry(legacyGeometry, options);
};

describe('JSONLoader BufferGeometry construction', () => {
  it('splits a quad into two triangles matching the legacy Face3 split', () => {
    const json = {
      metadata: { formatVersion: 3 },
      vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], // 4 verts: a,b,c,d
      // type bit0 = isQuad, no material/uv/normal/color bits
      faces: [bit(0), 0, 1, 2, 3],
    };
    const geometry = parseToBufferGeometry(json);
    const index = geometry.getIndex().array;
    // faceA = (a,b,d) = (0,1,3), faceB = (b,c,d) = (1,2,3)
    expect(Array.from(index)).toEqual([0, 1, 3, 1, 2, 3]);
  });

  it('builds material groups from per-face materialIndex, including quads', () => {
    const json = {
      metadata: { formatVersion: 3 },
      vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 2, 0, 0],
      faces: [
        bit(0, 1), 0, 1, 2, 3, 5, // quad with hasMaterial, materialIndex 5
        bit(1), 0, 1, 4, 7,       // triangle with hasMaterial, materialIndex 7
      ],
    };
    const geometry = parseToBufferGeometry(json);
    expect(geometry.groups).toEqual([
      { start: 0, count: 6, materialIndex: 5 },
      { start: 6, count: 3, materialIndex: 7 },
    ]);
  });

  it('builds morphAttributes.position and .normal from morphTargets/morphNormals', () => {
    const json = {
      metadata: { formatVersion: 3 },
      vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
      faces: [bit(), 0, 1, 2],
      morphTargets: [
        { name: 'frame0', vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0] },
        { name: 'frame1', vertices: [5, 5, 5, 6, 5, 5, 6, 6, 5] },
      ],
      morphNormals: [
        { normals: [0, 0, 1, 0, 0, 1, 0, 0, 1] },
        { normals: [1, 0, 0, 1, 0, 0, 1, 0, 0] },
      ],
    };
    const geometry = parseToBufferGeometry(json, { localTimeEnabled: true });
    expect(geometry.morphAttributes.position.length).toBe(2);
    expect(Array.from(geometry.morphAttributes.position[1].array)).toEqual([5, 5, 5, 6, 5, 5, 6, 6, 5]);
    expect(geometry.morphAttributes.normal.length).toBe(2);
    expect(Array.from(geometry.morphAttributes.normal[0].array)).toEqual([0, 0, 1, 0, 0, 1, 0, 0, 1]);
  });

  it('builds morphAttributes.color from morphColors', () => {
    //morphColors (like the base 'colors' palette) is a flat array of
    //packed hex colour ints repeated 3x per logical colour, not literal
    //0-1 RGB floats, mirroring how real LibZinc exports encode it (see
    //copyMorphColorsToIndexedBufferGeometry/getColorsRGB) - and every
    //group of 3 consecutive vertices shares one such colour entry, so a
    //6-vertex, 2-triangle geometry needs exactly 2 colour entries.
    const red = 0xff0000, green = 0x00ff00;
    const json = {
      metadata: { formatVersion: 3 },
      vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 2, 0, 0, 2, 1, 0],
      faces: [bit(), 0, 1, 2, bit(), 3, 4, 5],
      morphColors: [
        { name: 'c0', colors: [red, red, red, green, green, green] },
      ],
    };
    const geometry = parseToBufferGeometry(json, { localMorphColour: true });
    expect(geometry.morphAttributes.color.length).toBe(1);
    const c = geometry.morphAttributes.color[0].array;
    expect(Array.from(c)).toEqual([1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);
  });

  it('handles the degenerate trailing-index point format', () => {
    const json = {
      metadata: { formatVersion: 3 },
      vertices: [0, 0, 0],
      faces: [0, 0, 0, 0],
    };
    const geometry = parseToBufferGeometry(json);
    expect(geometry.getAttribute('position').count).toBe(1);
  });

  it('defaults vertex colours to white when the file has none', () => {
    const json = {
      metadata: { formatVersion: 3 },
      vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
      faces: [bit(), 0, 1, 2],
    };
    const geometry = parseToBufferGeometry(json);
    expect(Array.from(geometry.getAttribute('color').array)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
  });
});
