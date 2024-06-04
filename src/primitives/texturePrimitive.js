const THREE = require('three');
const resolveURL = require('../utilities').resolveURL;
/**
 * Provides a base class object which stores textures and rendering object.
 * 
 * @class
 * @author Alan Wu
 * @return {TexturePrimitive}
 */
const TexturePrimitive = function (textureIn) {
  (require('./zincObject').ZincObject).call(this);
  this.isTexturePrimitive = true;
  this.texture = textureIn;

  /**
   * Load texture data into this primitves.
   * 
   * @param {Object} textureData - contains the informations about the textures.
   * @param {Function} finishCallback - User's function to be called once texture's
   *  is loaded.
   */
  this.load = (textureData, finishCallback, isInline) => {
    if (textureData) {
      if (textureData.images && textureData.images.source) {
        const texture = new (require('../texture/textureArray').TextureArray)();
        const imgArray = [];
        textureData.images.source.forEach(img => {
          imgArray.push(resolveURL(img));
        });
        const _this = this;
        texture.loadFromImages(imgArray).then(() => {
          _this.texture = texture;
          _this.initialise(textureData, finishCallback);
        });
      }
    }
  }

  /**
   * Initialise a texture based on the provided textureData, this should be used
   * internally only.
   * 
   * @param {Object} textureData - contains the informations about the textures.
   * @param {Function} finishCallback - User's function to be called once texture's
   *  is loaded.
   */
  this.initialise = (textureData, finishCallback) => {
    if (finishCallback != undefined && (typeof finishCallback == 'function')) {
      finishCallback(this);
    }
  }


}

TexturePrimitive.prototype = Object.create((require('./zincObject').ZincObject).prototype);
TexturePrimitive.prototype.constructor = TexturePrimitive;
exports.TexturePrimitive = TexturePrimitive;
