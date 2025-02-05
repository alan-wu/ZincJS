const SpriteText = require('three-spritetext').default;

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
exports.Label = function (textIn, colour) {
  let text = textIn;
  let sprite = undefined;
  if (colour)
    sprite = new SpriteText(text, 0.015, colour.getStyle());
  else
    sprite = new SpriteText(text, 0.015);
  sprite.fontFace = "Asap";
  sprite.fontWeight = 700;
  sprite.material.map.generateMipmaps = false;
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
    if (sprite) {
      sprite.position.set(x, y, z);
    }
  }

  /**
   * Set the colour of the label
   * 
   * @param {THREE.Color} colour - colour to be set
   */
  this.setColour = colour => {
    sprite.color = colour.getStyle();
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



