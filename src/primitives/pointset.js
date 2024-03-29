const THREE = require('three');
const Points = require('../three/Points').Points;
const toBufferGeometry = require('../utilities').toBufferGeometry;

/**
 * Provides an object which stores points and provides method which controls its position.
 * This is created when a valid json file containing point is read into a {@link Zinc.Scene}
 * object.
 * 
 * @class
 * @author Alan Wu
 * @return {Pointset}
 */
const Pointset = function () {
  (require('./zincObject').ZincObject).call(this);
  this.isPointset = true;

  /** Shape of the points is created using the function below */
  const getCircularTexture = () => {
    var image = new Image();
    image.src = require("../assets/disc.png");
    const texture = new THREE.Texture();
    texture.image = image;
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Create the pointsets using geometry and material.
   * 
   * @param {THREE.Geomtry} geometryIn - Geometry of points to be rendered.
   * @param {THREE.Material} materialIn - Material to be set for the lines.
   * @param {Object} options - Provide various options
   * @param {Boolean} options.localTimeEnabled - A flag to indicate either the lines is
   * time dependent.
   * @param {Boolean} options.localMorphColour - A flag to indicate either the colour is
   * time dependent.
   */
  this.createMesh = (geometryIn, materialIn, options) => {
    if (geometryIn && materialIn) {
      let geometry = toBufferGeometry(geometryIn, options);
      const texture = getCircularTexture();
      materialIn.map = texture;
      let point = new Points(geometry, materialIn);
      this.setMesh(point, options.localTimeEnabled, options.localMorphColour);
    }
  }

  /**
   * Set the size of the points.
   * 
   * @param {Number} size - size to be set.
   */
  this.setSize = size => {
    if (this.morph && this.morph.material) {
      this.morph.material.size = size;
      this.morph.material.needsUpdate = true;
    }
  }

  /**
   * Turn size attenuation on/off based on the flag.
   * 
   * @param {Boolean} flag - Determin either size attenuation
   * should be on or off.
   */
  this.setSizeAttenuation = flag => {
    if (this.morph && this.morph.material) {
      this.morph.material.sizeAttenuation = flag;
      this.morph.material.needsUpdate = true;
    }
  }
}

Pointset.prototype = Object.create((require('./zincObject').ZincObject).prototype);
exports.Pointset = Pointset;
