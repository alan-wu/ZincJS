import * as THREE from 'three';
import SpriteTextModule from 'three-spritetext';
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
  sprite.fontFace = "Asap";
  sprite.fontSize = 90;
  sprite.fontWeight = fontWeight;
  sprite.material.map.generateMipmaps = true;
  sprite.material.map.anisotropy = 4;
  sprite.material.minFilter = THREE.LinearMipmapLinearFilter; // Smooth downscaling
  sprite.material.magFilter = THREE.LinearFilter;
  sprite.material.sizeAttenuation = false;
  sprite.center.x = -0.05;
  sprite.center.y = 0;



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
      sprite.color = colourIn.getStyle();
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
    //sprite.dispose();
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



