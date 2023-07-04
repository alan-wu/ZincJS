const THREE = require('three');
const shader = require("../shaders/textureSlide.js");
/**
 * Provides a class which create a texture stacks in a block
 * with shaders allowing slices of texture to be displayed.
 * 
 * @param {TextureArray} textureIn - An object of texture array
 * holding texture information.
 * 
 * @class
 * @author Alan Wu
 * @return {TextureSlides}
 */
const TextureSlides = function (textureIn) {
  (require('./texturePrimitive').TexturePrimitive).call(this, textureIn);
  this.isTextureSlides = true;
  
  /**
    @typedef SLIDE_SETTINGS
    @type {Set}
    @property {String} direction - the value must be x, y or z, specify the
    direction the slide should be facing.
    @property {Number} value - Normalised value of the location on direction.
   */
  /**
   * Create the slides required for visualisation based on the slide settings.
   * The slides itself is an {THREE.PlanGeometry} object.
   * 
   * @param {SLIDE_SETTINGS} slideSettings - An array to each slide settings.
   */
  this.createSlides = slideSettings => {
    if (!this.morph) this.morph = new THREE.Group();
    if (this.texture && this.texture.isTextureArray && this.texture.isReady()) {
      slideSettings.forEach(slide => {
        if (slide.direction && slide.value) {
          const geometry = new THREE.PlaneGeometry( 1, 1 );
          geometry.translate(0.5, 0.5, 0);
          const uniforms = shader.getUniforms();
          uniforms.diffuse.value = this.texture.impl;
          uniforms.depth.value = this.texture.size.depth;
          switch(slide.direction) {
            case "x":
              uniforms.slide.value.set(slide.value, 0, 0);
              break;
            case "y":
              uniforms.slide.value.set(0, slide.value, 0);
              break;
            case "z":
              uniforms.slide.value.set(0, 0, slide.value);
              break;
            default:
              break;
          }
          const options = {
            fs: shader.fs,
            vs: shader.vs,
            uniforms: uniforms,
            glslVersion: shader.glslVersion,
            side: THREE.DoubleSide,
            transparent: false
          };
          const material = this.texture.getMaterial(options);
          material.needsUpdate = true;
          const mesh = new THREE.Mesh( geometry, material );
          this.morph.add(mesh);
        }
      });
    }
  }

  /**
   * Get  the array of slides, return them in an array
   *
   * @return {Array} - Return an array of {@link THREE.Object)
   */
  this.getSlides = () => {
    if (this.morph) return [...this.morph.children];
    return [];
  }

  /**
   * Remove a slide, this will dispose the slide and its material.
   *
   * @param {Slide} slide - An array to each slide settings.
   */
  this.removeSlide = slide => {
    if (slide && this.morph) {
      if (this.morph.getObjectById(slide.id)) {
        this.morph.remove(slide);
        slide.disppose();
        if (slide.geometry)
          slide.geometry.dispose();
        if (slide.material)
          slide.material.dispose();
      }
    }
  }

  /**
   * Clean up all internal objects.
   */
  this.dispose = () => {
    this.morph.children.forEach(slide=> {
      if (slide.geometry)
        slide.geometry.dispose();
      if (slide.material)
        slide.material.dispose();
    });
    (require('./texturePrimitive').TexturePrimitive).prototype.dispose.call(this);
  }

  /**
   * Get the bounding box of this geometry.
   * 
   * @return {THREE.Box3}.
   */
  this.getBoundingBox = function() {
    if (this.morph && this.morph.children && this.morph.visible &&
      this.boundingBoxUpdateRequired) {
      let first = true;
      this.morph.children.forEach( morph => {
        if (first) {
          this.cachedBoundingBox.setFromBufferAttribute(
            morph.geometry.attributes.position);
          first = false;
        } else {
          this.cachedBoundingBox.expandByObject(morph);
        }
      });
      this.boundingBoxUpdateRequired = false;
      return this.cachedBoundingBox;
    }
    return undefined;
  }
}


TextureSlides.prototype = Object.create((require('./texturePrimitive').TexturePrimitive).prototype);
exports.TextureSlides = TextureSlides;
