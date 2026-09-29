import * as THREE from 'three/webgpu';
import SpriteTextModule from 'three-spritetext';
import { setSpriteTextFont, replaceSpriteTextMaterial } from '../utilities';
const SpriteText = SpriteTextModule.default || SpriteTextModule;

/**
 * Bitmap labels, this is used with {@link Glyph} to
 * provide labels.
 *
 * @param {String} textIn - Text to be displayed dwith the label.
 * @param {THREE.Color} colour - Colour to be set for the label.
 *
 * @class
 * @author Alan Wu
 * @return {Label}
 */
const Label = function (textIn, colourIn) {
  let text = textIn;
  let sprite = undefined;
  const position = [0, 0, 0];
  let colour = colourIn;
  let size = 1.0;
  let fontWeight = 500;
  const textHeight = 0.012;
  if (colourIn)
    sprite = new SpriteText(text, textHeight, colourIn.getStyle());
  else
    sprite = new SpriteText(text, textHeight);
  setSpriteTextFont(sprite, "Asap", 90, fontWeight);
  replaceSpriteTextMaterial(sprite);
  sprite.material.sizeAttenuation = false;
  sprite.center.x = -0.05;
  sprite.center.y = 0;
  //SpriteText replaces the texture whenever the text, colour or size
  //changes, the settings need to be re-applied to the new texture.
  const applyTextureSettings = () => {
    const texture = sprite.material.map;
    if (texture) {
      texture.generateMipmaps = true;
      texture.anisotropy = 4;
      texture.minFilter = THREE.LinearMipmapLinearFilter; // Smooth downscaling
      texture.magFilter = THREE.LinearFilter;
    }
  }
  applyTextureSettings();


  /**
   * Get the current position in an array containing the x, y and z
   * coordinates.
   *
   * @return {Array}
   */
  this.getPosition = () => {
    if (sprite)
      return [sprite.position.x, sprite.position.y, sprite.position.z];
    return [0, 0, 0];
  }

  /**
   * Set the position of the label in  3D coordinates.
   *
   * @param {Number} x - x coordinate to be set.
   * @param {Number} y - y coordinate to be set.
   * @param {Number} z - z coordinate to be set.
   */
  this.setPosition = (x, y, z) => {
    position[0] = x;
    position[1] = y;
    position[2] = z;

    if (sprite) {
      sprite.position.set(x, y, z);
    }
  }

  /**
   * Set the colour of the label
   *
   * @param {THREE.Color} colour - colour to be set
   */
  this.setColour = colourIn => {
    if (colourIn) {
      //Changing the colour redraws the canvas and creates a new texture,
      //only do it when the colour has changed.
      const style = colourIn.getStyle();
      if (style !== sprite.color) {
        sprite.color = style;
        applyTextureSettings();
      }
      colour = colourIn;
    }
  }

  /**
   * Scale the label.
   *
   * @param {Number} scaling - Scale to be set.
   */
  this.setScale = scaling => {
    if (sprite && scaling > 0.0)
      sprite.scale.set(scaling, scaling, 1.0);
  }

  /**
   * Set depth test for sprite object.
   *
   * @param {Boolean} flag - Enable/disable depth test
   */
  this.setDepthTest = flag => {
    if (flag && flag !== sprite.material.depthTest) {
      sprite.material.depthTest = flag;
    }
  }

  /**
   * Set a new text for the label.
   *
   * @param {Number} scaling - Scale to be set.
   */
  this.setSize = sizeIn => {
    if (sizeIn > 0.0) {
      sprite.textHeight = textHeight * sizeIn;
      applyTextureSettings();
      size = sizeIn;
    }
  }

  /**
   * Set a new text for the label.
   *
   * @param {Number} scaling - Scale to be set.
   */
  this.setFontWeight = fontWeightIn => {
    if (fontWeightIn && fontWeightIn !== fontWeight) {
      sprite.fontWeight = fontWeightIn;
      applyTextureSettings();
      fontWeight = fontWeightIn;
    }
  }

  /**
   * Set a new text for the label.
   *
   * @param {Number} scaling - Scale to be set.
   */
  this.setText = textIn => {
    if (textIn && textIn !== sprite.text) {
      //Force teh texture to update
      const canvas = sprite._canvas;
      if (sprite.material && sprite.material.map) {
        sprite.material.map.dispose();
      }
      if (sprite._canvas) {
        const ctx = sprite._canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, sprite._canvas.width, sprite._canvas.height);
        }
        sprite._canvas.width = 1;
        sprite._canvas.height = 1;
      }
      sprite.text = textIn;
      sprite.textHeight = textHeight * size;
      text = textIn;
      if (sprite.material && sprite.material.map) {
        applyTextureSettings();
        sprite.material.map.needsUpdate = true;
      }
    }
  }

  /**
   * Set visibility of the label.
   *
   * @param {Boolean} flag - Visibility to set
   */
  this.setVisibility = flag => {
    sprite.visible = flag;
  }

  /**
   * Free up the memory
   */
  this.dispose = () => {
    if (sprite) {
      sprite.removeFromParent();
      if (sprite.material) {
        sprite.material.map?.dispose();
        sprite.material.dispose();
      }
      //Release the canvas memory
      if (sprite._canvas) {
        sprite._canvas.width = 0;
        sprite._canvas.height = 0;
      }
    }
  }

  /**
   * Get the intrnal sprite.
   *
   * @return {THREE.Sprite}
   */
  this.getSprite = () => {
    return sprite;
  }

  /**
   * Get the text.
   *
   * @return {String}
   */
  this.getString = () => {
    return text;
  }

};

export { Label };



