const THREE = require('three');

/**
 * Texture array object for holding array of images into
 * texures unit that can be used by other texture primitives.
 * 
 * @class
 * @author Alan Wu
 * @return {TextureArray}
 */
const TextureArray = function () {
  (require('./texture').Texture).call(this);
  this.isTextureArray = true;


  /**
   * Read images from an array containg src locations.
   * 
   * @async
   * @param {Array} srcArrays - List of source location of the images.
   */
  this.loadFromImages = async (srcArrays) => {
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
        const data = await this.imageToUint8Array(this, image, srcArrays[i], canvas);
        if (data && data.array) {
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

      this.impl = new THREE.DataTexture2DArray(fullArray, w, h, d);
      this.size = {
        width: w,
        height: h,
        depth: d
      };
      this.isLoading = false;
    }
  }

  /**
   * Get and create the material containing shaders and the textures.
   * The texture must be read and ready before calling this function.
   * 
   *
   * @param {Object} options - Customise the material with the options object.
   * @param {String} options.fs - string of the fragment shader used for 
   * visualisation.
   * @param {String} options.vs - string of the vertex shader used for 
   * visualisation.
   * @param {Object} options.uniforms - Containing the data to be passed into the shaders.
   * @param {String} options.glslVersion - Version of glsl used for compile this shader.
   * 
   */
  this.getMaterial = (options) => {
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
          material = new THREE.ShaderMaterial({
            transparent,
            uniforms: options.uniforms,
            vertexShader: options.vs,
            fragmentShader: options.fs,
            side
          });
          if (options.glslVersion) {
            material.glslVersion = options.glslVersion;
          }
        }
      } else {
        material = new THREE.MeshBasicMaterial({
          color: new THREE.Color(1, 1, 1),
          transparent: false,
          opacity: 1.0,
          map: this.impl,
          side: THREE.DoubleSide
        });
      }
      if (material) {
        material.needsUpdate = true;
        return material;
      }
    }
  }
}

TextureArray.prototype = Object.create((require('./texture').Texture).prototype);
exports.TextureArray = TextureArray;
