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

loadImage = function(img, src) {
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  })
}

imageToUint8Array = async function(img, src, canvas) {
  await loadImage(img, src);
  canvas.width = img.width;
  canvas.height = img.height;
  console.log(img.width, img.height)
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return {
    array: new Uint8Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer),
    width: canvas.width,
    height: canvas.height
  };
}

Texture.prototype.loadFromImages = async function(srcArrays) {
  let w = 1;
  let h = 1;
  let d = 0;
  if (srcArrays && srcArrays.length) {
    this.isLoading = true;
    const image = new Image();
    image.crossOrigin = "Anonymous";
    const canvas = document.createElement("canvas");
    let length = 0;
    const dataStacks = new Array(srcArrays.length);
    for (let i = 0; i < srcArrays.length; i++) {
      const data = await imageToUint8Array(image, srcArrays[i], canvas);
      if (data.array) {
        w = data.width;
        h = data.height;
        dataStacks[d] = data.array;
        length += dataStacks[d].length;
        d++;
      }
    }
    const fullArray = new Uint8Array(length);
    length = 0;
    dataStacks.forEach(data => {
      fullArray.set(data, length);
      length += data.length;
    });
    
    this.impl = new THREE.DataTexture2DArray( fullArray, w, h, d );
    this.size.width = w;
    this.size.height = h;
    this.size.depth = d;
    this.isLoading = false;
  }
}

Texture.prototype.isReady = function(options) {
  if (this.impl && !this.isLoading)
    return true;
  return false;
}

Texture.prototype.getMaterial = function(options) {
  if (this.impl) {
    let material = undefined;
    if (options) {
      if (options.vs && options.fs) {
        let transparent = true;
        if (options.transparent)
          transparent = options.transparent;
        let side = THREE.FrontSide;
        if (options.side)
          side = options.side;
        material = new THREE.ShaderMaterial( {
          transparent,
          uniforms: options.uniforms,
          vertexShader: options.vs,
          fragmentShader: options.fs,
          side
        } ); 
        if (options.glslVersion) {
          material.glslVersion = options.glslVersion;
        }
      }
    } else {
      material = new THREE.MeshBasicMaterial({
        color : new THREE.Color(1, 1, 1),
        transparent : false,
        opacity : 1.0,
        map : this.impl,
        side : THREE.DoubleSide
      });
    }
    if (material) {
      material.needsUpdate = true;
      return material;
    }
  }
}

exports.Texture = Texture;
