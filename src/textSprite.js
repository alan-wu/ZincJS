import * as THREE from 'three/webgpu';
import SpriteTextModule from 'three-spritetext';
import { requestRenderAll } from './renderRequests';
const SpriteText = SpriteTextModule.default || SpriteTextModule;

/*
 * Text sprites (labels, marker numbers) are drawn on a canvas by
 * three-spritetext. To keep the text sharp the canvas resolution is chosen
 * from the size of the text on screen instead of a fixed font size, and it
 * is redrawn once web fonts have finished loading.
 */

//Canvas pixels per screen pixel, a little oversampling smooths the edges
const OVERSAMPLE = 1.5;
const MIN_FONT_SIZE = 16;
const MAX_FONT_SIZE = 256;
//Only redraw when the screen scale has changed by more than this ratio
const RESCALE_THRESHOLD = 0.1;

/*
 * Screen pixels per unit of sprite height. Text sprites do not use size
 * attenuation, their height is in view units at a distance of one, so this
 * is viewportHeight * pixelRatio / (2 * tan(fov / 2)). Default to a 1000
 * pixels viewport with the 40 degrees field of view used by the scenes.
 */
let pixelsPerUnit = 1000 / (2 * Math.tan(20 * Math.PI / 180));

//Weak references to every live text sprite, so they can be redrawn
const sprites = new Set();
let fontListenerAdded = false;

const fontSizeForHeight = (textHeight) => {
  const size = Math.round(textHeight * pixelsPerUnit * OVERSAMPLE);
  return Math.min(Math.max(size, MIN_FONT_SIZE), MAX_FONT_SIZE);
}

/*
 * The canvas matches the on screen size so mipmaps are not required,
 * they blur the text when it is shrunk.
 */
const applyTextureSettings = (sprite) => {
  const texture = sprite.material?.map;
  if (texture) {
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 1;
  }
}

/*
 * SpriteText redraws its canvas and creates a new texture in every setter,
 * set all font properties before a single redraw instead.
 */
const setFont = (sprite, fontFace, fontSize, fontWeight) => {
  if ('_fontFace' in sprite && typeof sprite._genCanvas === 'function') {
    sprite._fontFace = fontFace;
    sprite._fontSize = fontSize;
    sprite._fontWeight = fontWeight;
    sprite._genCanvas();
  } else {
    sprite.fontFace = fontFace;
    sprite.fontSize = fontSize;
    sprite.fontWeight = fontWeight;
  }
}

/*
 * Redraw the sprite at the resolution required for its current height.
 */
const refreshTextSprite = (sprite, force = false) => {
  const fontSize = fontSizeForHeight(sprite.textHeight);
  if (force || fontSize !== sprite.fontSize) {
    setFont(sprite, sprite.fontFace, fontSize, sprite.fontWeight);
    applyTextureSettings(sprite);
  }
}

const forEachSprite = (callback) => {
  sprites.forEach((ref) => {
    const sprite = ref.deref();
    if (sprite) {
      callback(sprite);
    } else {
      sprites.delete(ref);
    }
  });
}

const redrawAll = () => {
  forEachSprite((sprite) => refreshTextSprite(sprite, true));
  requestRenderAll();
}

/*
 * The canvas is drawn with a fallback font if a web font has not been
 * loaded yet, redraw once it is available.
 */
const waitForFont = (sprite) => {
  if (typeof document === 'undefined' || !document.fonts) {
    return;
  }
  if (!fontListenerAdded && document.fonts.addEventListener) {
    //Catch fonts from stylesheets added after the sprites are created
    document.fonts.addEventListener('loadingdone', redrawAll);
    fontListenerAdded = true;
  }
  const font = `${sprite.fontWeight} ${sprite.fontSize}px ${sprite.fontFace}`;
  try {
    if (!document.fonts.check(font)) {
      document.fonts.load(font).then(() => {
        refreshTextSprite(sprite, true);
        requestRenderAll();
      }).catch(() => {});
    }
  } catch {
    //Invalid font string, keep the fallback font
  }
}

const registerTextSprite = (sprite) => {
  sprites.add(new WeakRef(sprite));
}

/**
 * Stop tracking a text sprite, call this when it is disposed.
 */
const releaseTextSprite = (sprite) => {
  sprites.forEach((ref) => {
    const trackedSprite = ref.deref();
    if (!trackedSprite || trackedSprite === sprite) {
      sprites.delete(ref);
    }
  });
}

/**
 * Create a text sprite rendered with a node material, the canvas resolution
 * is chosen from the size of the text on screen.
 *
 * @param {String} text - Text to display.
 * @param {Number} textHeight - Height of a line of text in view units.
 * @param {String} colour - CSS colour of the text.
 * @param {String} fontFace - Font family.
 * @param {Number|String} fontWeight - Font weight.
 * @return {SpriteText}
 */
const createTextSprite = (text, textHeight, colour, fontFace, fontWeight) => {
  const sprite = colour ? new SpriteText(text, textHeight, colour) :
    new SpriteText(text, textHeight);
  setFont(sprite, fontFace, fontSizeForHeight(textHeight), fontWeight);
  //Replace the SpriteMaterial created by SpriteText with a node material
  //using the same canvas texture.
  const originalMaterial = sprite.material;
  sprite.material = new THREE.SpriteNodeMaterial({
    map: originalMaterial.map,
  });
  originalMaterial.map = null;
  originalMaterial.dispose();
  sprite.material.sizeAttenuation = false;
  applyTextureSettings(sprite);
  registerTextSprite(sprite);
  waitForFont(sprite);
  return sprite;
}

/**
 * Set the height of a text sprite and redraw it once at the matching
 * resolution.
 */
const setTextSpriteHeight = (sprite, textHeight) => {
  if ('_textHeight' in sprite) {
    sprite._textHeight = textHeight;
    refreshTextSprite(sprite, true);
  } else {
    sprite.textHeight = textHeight;
    refreshTextSprite(sprite);
  }
}

/**
 * Update the number of screen pixels per unit of text height, e.g. when the
 * viewport is resized. Text sprites are redrawn if it has changed
 * significantly.
 *
 * @param {Number} value - viewportHeight * pixelRatio / (2 * tan(fov / 2))
 */
const setTextPixelsPerUnit = (value) => {
  if (!(value > 0) || !isFinite(value)) {
    return;
  }
  if (Math.abs(value / pixelsPerUnit - 1) > RESCALE_THRESHOLD) {
    pixelsPerUnit = value;
    forEachSprite((sprite) => refreshTextSprite(sprite));
    requestRenderAll();
  }
}

const getTextPixelsPerUnit = () => pixelsPerUnit;

export {
  applyTextureSettings as applyTextSpriteTextureSettings,
  createTextSprite,
  fontSizeForHeight,
  getTextPixelsPerUnit,
  refreshTextSprite,
  registerTextSprite,
  releaseTextSprite,
  setTextPixelsPerUnit,
  setTextSpriteHeight,
};
