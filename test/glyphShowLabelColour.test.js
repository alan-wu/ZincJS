import * as THREE from 'three/webgpu';
import { it, expect, vi } from 'vitest';

// Label wraps three-spritetext's SpriteText, which needs a real canvas 2D
// context - unavailable in this project's test environment (happy-dom, no
// canvas package - see test/glyphsetLabelSync.test.js's comment for the
// exact failure). Mock Label with a lightweight fake that just records what
// it was constructed with (in `createdLabels`, since Glyph keeps the actual
// Label instance private), so Glyph's own logic (this file's actual
// subject) can be exercised without touching SpriteText/canvas at all.
const { createdLabels } = vi.hoisted(() => ({ createdLabels: [] }));
vi.mock('../src/primitives/label', () => {
  function FakeLabel(text, colour) {
    this.text = text;
    this.colour = colour;
    this.sprite = new THREE.Object3D();
    this.sprite.material = {};
    createdLabels.push(this);
  }
  FakeLabel.prototype.getPosition = function () {
    return [this.sprite.position.x, this.sprite.position.y, this.sprite.position.z];
  };
  FakeLabel.prototype.setPosition = function (x, y, z) {
    this.sprite.position.set(x, y, z);
  };
  FakeLabel.prototype.setColour = function (colour) {
    this.colour = colour;
  };
  FakeLabel.prototype.getSprite = function () {
    return this.sprite;
  };
  FakeLabel.prototype.dispose = function () {};
  return { Label: FakeLabel };
});

const { Glyph } = await import('../src/primitives/glyph');

// Glyphset.showLabel() only has one colour to offer every glyph -
// this.morph.material.color, a single shared value - as a fallback for
// glyphs that were never given their own colour. Glyph.showLabel() used to
// always use that passed-in colour, discarding whatever correct per-instance
// colour setColour() had already established (e.g. from a GPU-compute
// glyphset's initial/resynced colour - see glyphset.js's
// applyGlyphComputeResult), so toggling labels off and back on would revert
// every label to the shared material colour until the next resync. Fixed by
// having Glyph remember its own last colour (getColour()) and having
// showLabel() prefer it over the passed-in fallback.

it("showLabel() uses the glyph's own last colour over the passed-in fallback", () => {
  createdLabels.length = 0;
  const glyph = new Glyph(undefined, undefined, 0, undefined);
  glyph.setLabel('a label');

  const ownColour = new THREE.Color(0x00ff00);
  glyph.setColour(ownColour);
  expect(glyph.getColour().getHex()).toBe(ownColour.getHex());

  const fallbackColour = new THREE.Color(0xff0000);
  glyph.showLabel(fallbackColour);

  expect(createdLabels.length).toBe(1);
  expect(createdLabels[0].colour.getHex()).toBe(ownColour.getHex());
});

it('showLabel() falls back to the passed-in colour when the glyph has none of its own', () => {
  createdLabels.length = 0;
  const glyph = new Glyph(undefined, undefined, 0, undefined);
  glyph.setLabel('a label');

  const fallbackColour = new THREE.Color(0xff0000);
  glyph.showLabel(fallbackColour);

  expect(glyph.getColour()).toBeUndefined();
  expect(createdLabels.length).toBe(1);
  expect(createdLabels[0].colour.getHex()).toBe(fallbackColour.getHex());
});
