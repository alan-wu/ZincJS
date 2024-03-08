const THREE = require('three');

/**
 * Base texture object for importing images and turning them into
 * texures unit that can be used by other texture primitives.
 * 
 * @class
 * @author Alan Wu
 * @return {Texture}
 */
const Texture = function () {
  this.isTexture = true;
  this.impl = undefined;
  this.isLoading = false;
  this.size = {
    width: 1,
    height: 1,
    depth: 0
  };
}

/**
 * Read an image from src.
 * 
 * @async
 * @param {Image} img - An image object.
 * @param {String} src - Source location of the image.
 * 
 * @return {Promise} img on resolve.
 */
Texture.prototype.loadImage = function (img, src) {
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  })
}

/**
  @typedef IMAGE_UINT8_RETURN
  @type {Set}
  @property {Uint8Array} array - Array containing the uint8 image value.
  @property {Number} width - Phyiscal image width.
  @property {Number} height - Phyiscal image height.
  */
/**
 * Read an image from src and turn it into Uint8Array.
 * 
 * @async
 * @param {Image} img - An image object.
 * @param {String} src - Source location of the image.
 * @param {Canvas} canvas - Canvas html element used for the conversion.
 * 
 * @return {IMAGE_UNIT8_RETURN}
 */
Texture.prototype.imageToUint8Array = async function (instance, img, src, canvas) {
  await instance.loadImage(img, src);
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return {
    array: new Uint8Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer),
    width: canvas.width,
    height: canvas.height
  };
}

Texture.prototype.loadFromImages = async function (srcArrays) {
  return
}

/**
 * Return true if the texture is ready for consumption.
 * 
 * @return {Boolean}
 */
Texture.prototype.isReady = function () {
  if (this.impl && !this.isLoading)
    return true;
  return false;
}

/**
 * Return true if  the texture is ready for consumption, otherwise false.
 * 
 * @return {Boolean}
 */
Texture.prototype.getMaterial = function () {
  if (this.impl) {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 1, 1),
      transparent: false,
      opacity: 1.0,
      map: this.impl,
      side: THREE.DoubleSide
    });
  }
}

exports.Texture = Texture;
