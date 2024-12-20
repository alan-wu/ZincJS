const THREE = require('three');
const Points = require('../three/Points').Points;
const toBufferGeometry = require('../utilities').toBufferGeometry;
const getCircularTexture = require('../utilities').getCircularTexture;
const Label = require('./label').Label;

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
  const labelSets = [];

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
      this.setMesh(point, options.localTimeEnabled, 
        options.localMorphColour);
    }
  }

  const addLabel = (index, coord, labelText, colourHex) => {
    if (labelText) {
      const colour = new THREE.Color(colourHex);
      const label = new Label(labelText, colour);
      label.setPosition(coord[0], coord[1], coord[2]);
      const sprite  = label.getSprite();
      sprite.material.sizeAttenuation = false;
      sprite.material.alphaTest = 0.5;
      sprite.material.transparent = true;
      sprite.material.depthWrite = false;
      sprite.material.depthTest = false;
      this.group.add(sprite);
      labelSets[index] = label;
    }
  }

  /**
   * Add points to existing mesh if it exists, otherwise
   * create a new one and add to it.
   * @param {Array} coords  -An array of three components coordinates.
   * @param {Array|String} labels - An array of strings, these are only added
   * if the number of coords equals to the number labels provided.
   * @param {Number} colour - A hex value of the colour for the points
   */
  this.addPoints = (coords, labels, colour) => {
    if (coords && coords.length > 0) {
      let current = this.drawRange - 1;
      const geometry = this.addVertices(coords);
      let mesh = this.getMorph();
      if (!mesh) {
        let material = new THREE.PointsMaterial({ alphaTest: 0.5, size: 10,
          color: colour, sizeAttenuation: false });
        const options = { localTimeEnabled: false, localMorphColour: false};
        geometry.colorsNeedUpdate = true;
        this.createMesh(geometry, material, options);
      }
      let end = current + coords.length;
      let index = 0;
      if ((Array.isArray(labels) && labels.length === coords.length) || 
        (typeof labels === "string")) {
        for (current; current + index < end;) {
          const labelText = typeof labels === "string" ? labels : labels[index];
          addLabel(index, coords[index], labelText, colour);
          index++;
        }
      }
      if (this.region) this.region.pickableUpdateRequired = true;
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

  /**
   * Get vertices at index
   */
  this.getVerticesByIndex = function(index) {
    if (index >= 0 && this.drawRange > index) {
      const positionAttribute = this.getMorph().geometry.getAttribute( 'position' );
      return [ 
        positionAttribute.getX(index),
        positionAttribute.getY(index),
        positionAttribute.getZ(index)
      ];
    }
    return undefined;
  }

  /**
   * Edit Vertice in index.
   */
  this.editVertices = function(coords, i) {
    if (coords && coords.length) {
      let mesh = this.getMorph();
      const maxIndex = i + coords.length - 1;
      if (!mesh || 0 > i || maxIndex >= this.drawRange) {
        return;
      } else {
        const positionAttribute = mesh.geometry.getAttribute( 'position' );
        let index = i;
        coords.forEach(coord => {
          const label = labelSets[index];
          if (label) {
            label.setPosition(coord[0], coord[1], coord[2]);
          }
          positionAttribute.setXYZ(index++, coord[0], coord[1], coord[2]);
          
        });
        positionAttribute.needsUpdate = true;
        this.boundingBoxUpdateRequired = true;
      }
    }
  }

  /**
 * Turn size attenuation on/off based on the flag.
 * 
 * @param {Boolean} flag - Determin either size attenuation
 * should be on or off.
 */
  this.render = (delta, playAnimation, cameraControls, options) => {
    if (this.morph && cameraControls) {
      this.morph.sizePerPixel = cameraControls.pixelHeight;
    }
    Pointset.prototype.render.call(this, delta, playAnimation, cameraControls, options);
  }
}

Pointset.prototype = Object.create((require('./zincObject').ZincObject).prototype);
exports.Pointset = Pointset;
