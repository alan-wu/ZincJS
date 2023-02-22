const THREE = require('three');

const Texture = function() {
  this.isTexture = true;
  this.impl = undefined;
  this.isLoading = false;
  this.size = {
    width: 1,
    height: 1,
    depth: 0
  };
}

Texture.prototype.loadImage = function(img, src) {
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  })
}

Texture.prototype.imageToUint8Array = async function(img, src, canvas) {
  await this.loadImage(img, src);
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

Texture.prototype.loadFromImages = async function(srcArrays) {
  return
}

Texture.prototype.isReady = function() {
  if (this.impl && !this.isLoading)
    return true;
  return false;
}

Texture.prototype.getMaterial = function() {
  if (this.impl) {
    return  new THREE.MeshBasicMaterial({
      color : new THREE.Color(1, 1, 1),
      transparent : false,
      opacity : 1.0,
      map : this.impl,
      side : THREE.DoubleSide
    });
  }
}

exports.Texture = Texture;
