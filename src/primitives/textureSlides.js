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
  const textureSettings = [];
  const idTextureMap = {};
  this.setMorph(new THREE.Group());
  this.morph.userData = this;
  const alpha = 1.0;

  /**
    @typedef SLIDE_SETTINGS
    @type {Set}
    @property {String} direction - the value must be x, y or z, specify the
    direction the slide should be facing.
    @property {Number} value - Normalised value of the location on direction.
    @property {String} id - ID of the mesh, it is only available if the settings
    is returned from {@link TextureSlides.createSlide} or 
    {@link TextureSlides.getTextureSettings}.
   */
  /**
   * Create the slides required for visualisation based on the slide settings.
   * The slides themselves are {THREE.PlanGeometry} objects.
   * 
   * @param {SLIDE_SETTINGS} slideSettings - An array to each slide settings.
   */
  this.createSlides = slideSettings => {
    slideSettings.forEach(slide => this.createSlide(slide));
  }

  /**
   * Set the value of the uniforms for a specific mesh in this
   * texture slide object.
   *
   * @param {THREE.Mesh} mesh - Mesh to be modified
   * @param {SLIDE_SETTINGS} slideSettings - Slide settings.
   */
  const setUniformSlideSettingsOfMesh = (mesh, settings) => {
    const material = mesh.material;
    const uniforms = material.uniforms;
    switch (settings.direction) {
      case "x":
        uniforms.direction.value = 1;
        uniforms.slide.value.set(settings.value, 0, 0);
        break;
      case "y":
        uniforms.direction.value = 2;
        uniforms.slide.value.set(0, settings.value, 0);
        break;
      case "z":
        uniforms.direction.value = 3;
        uniforms.slide.value.set(0, 0, settings.value);
        break;
      default:
        break;
    }
    material.needsUpdate = true;
    this.boundingBoxUpdateRequired = true;
  }

  /**
   * Modify the mesh based on a setting
   *
   * @param {SLIDE_SETTINGS} settings - s.
   */
  this.modifySlideSettings = (settings) => {
    if (settings && settings.id &&
      settings.id in idTextureMap &&
      idTextureMap[settings.id]) {
      setUniformSlideSettingsOfMesh(idTextureMap[settings.id], settings);
    }
  }

  /**
   * Create a slide required for visualisation based on the slide settings.
   * The slide itself is an {THREE.PlanGeometry} object.
   *
   * @param {SLIDE_SETTINGS} settings -settings of the slide to be created.
   * @return {SLIDE_SETTINGS} - Returned settings, it includes the newly
   * created mesh's id.
   */
  this.createSlide = settings => {
    if (this.texture && this.texture.isTextureArray && this.texture.isReady()) {
      if (settings && settings.direction && settings.value !== undefined) {
        const geometry = new THREE.PlaneGeometry(1, 1);
        geometry.translate(0.5, 0.5, 0);
        const uniforms = shader.getUniforms();
        uniforms.diffuse.value = this.texture.impl;
        uniforms.depth.value = this.texture.size.depth;
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
        const mesh = new THREE.Mesh(geometry, material);
        const slideSettings = {
          value: settings.value,
          direction: settings.direction,
          id: mesh.id,
        };
        textureSettings.push(slideSettings);
        setUniformSlideSettingsOfMesh(mesh, slideSettings);
        idTextureMap[mesh.id] = mesh;
        this.morph.add(mesh);
        return slideSettings;
      }
    }
  }

  /**
   * Return a copy of texture settings used by this object.
   *
   * @return {SLIDE_SETTINGS} - Returned the list of settings..
   */
  this.getTextureSettings = () => {
    return [...textureSettings];
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
   * @param {Slide} slide - Slide to be remvoed
   */
  this.removeSlide = slide => {
    if (slide) {
      this.removeSlideWithId(slide.id);
    }
  }

  /**
    * Remove a slide, this will dispose the slide and its material.
    *
    * @param {Number} id - id of slide to be remvoed
    */
  this.removeSlideWithId = id => {
    if (this.morph && id in idTextureMap && idTextureMap[id]) {
      if (this.morph.getObjectById(id)) {
        const slide = idTextureMap[id];
        this.morph.remove(slide);
        slide.clear();
        if (slide.geometry)
          slide.geometry.dispose();
        if (slide.material)
          slide.material.dispose();
        this.boundingBoxUpdateRequired = true;
      }
      const index = textureSettings.findIndex(item => item.id === id);
      if (index > -1) {
        textureSettings.splice(index);
      }
    }
  }

  /**
   * Clean up all internal objects.
   */
  this.dispose = () => {
    this.morph.children.forEach(slide => {
      if (slide.geometry)
        slide.geometry.dispose();
      if (slide.material)
        slide.material.dispose();
    });
    (require('./texturePrimitive').TexturePrimitive).prototype.dispose.call(this);
    this.boundingBoxUpdateRequired = true;
  }

  /**
   * Get the bounding box of this slides.
   * It uses the max and min of the slides position and the
   * transformation to calculate the position of the box.
   * 
   * @return {THREE.Box3}.
   */
  this.getBoundingBox = function () {
    if (this.morph && this.morph.children && this.morph.visible &&
      this.boundingBoxUpdateRequired) {
      this.cachedBoundingBox.makeEmpty();
      this.morph.children.forEach(slide => {
        const value = slide.material.uniforms.slide.value;
        this.cachedBoundingBox.expandByPoint(value);
      });
      this.morph.updateWorldMatrix(true, true);
      this.cachedBoundingBox.applyMatrix4(this.morph.matrixWorld);
      this.boundingBoxUpdateRequired = false;
    }
    return this.cachedBoundingBox;
  }
}

TextureSlides.prototype = Object.create((require('./texturePrimitive').TexturePrimitive).prototype);
exports.TextureSlides = TextureSlides;
