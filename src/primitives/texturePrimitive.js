const THREE = require('three');
/**
 * Provides a base class object which stores textures and rendering object.
 * 
 * @class
 * @author Alan Wu
 * @return {Zinc.Lines}
 */
const TexturePrimitive = function (textureIn) {
  (require('./zincObject').ZincObject).call(this);
  this.isTexturePrimitive = true;
  this.texture = textureIn;
}

TexturePrimitive.prototype = Object.create((require('./zincObject').ZincObject).prototype);
exports.TexturePrimitive = TexturePrimitive;
