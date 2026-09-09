import * as THREE from 'three/webgpu';
import { Label } from './label';
import { Points } from '../three/Points';
import { ZincObject } from './zincObject';
import { getCircularTexture, toBufferGeometry } from '../utilities';
import { augmentMorphColor } from './augmentShader';

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
  ZincObject.call(this);
  this.isPointset = true;
  const labelSets = [];
  let labelSize = 1.0;
  let labelDepthTest = false;
  let fontWeight = 500;
  let labelVisibility = true;

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
      console.log(geometry, options)
      if (options.localMorphColour && geometry.morphAttributes[ "color" ]) {
        materialIn.vertexColors = true;
        materialIn.onBeforeCompile = augmentMorphColor;
      }
      const texture = getCircularTexture();
      materialIn.map = texture;
      let point = new Points(geometry, materialIn);
      this.setMesh(point, options.localTimeEnabled, options.localMorphColour);
    }
  }

  const addLabel = (index, coord, labelText, colourHex) => {
    if (labelText) {
      const colour = new THREE.Color(colourHex);
      const label = new Label(labelText, colour);
      label.setPosition(coord[0], coord[1], coord[2]);
      const sprite = label.getSprite();
      sprite.material.sizeAttenuation = false;
      sprite.material.alphaTest = 0.5;
      sprite.material.transparent = true;
      sprite.material.depthWrite = false;
      sprite.material.depthTest = labelDepthTest;
      label.setFontWeight(fontWeight);
      label.setSize(labelSize);
      label.setVisibility(labelVisibility);
      this.group.add(sprite);
      labelSets[index] = label;
    }
  }

  const removeLabel = (index) => {
    const label = labelSets[index];
    if (label) {
      const sprite = label.getSprite();
      this.group.remove(sprite);
      label.dispose();
      labelSets.splice(index, 1);
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
      let current = this.drawRange;
      if (current === -1) {
        current = 0;
      }
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
        const size = labelSets.length;
        for (current; current + index < end;) {
          const labelText = typeof labels === "string" ? labels : labels[index];
          addLabel(current + index, coords[index], labelText, this._lod._material.color);
          index++;
        }
      }
      if (this.region) this.region.pickableUpdateRequired = true;
    }
  }

    /**
   * Set the colour of the pointset and its label using the hex value
   *
   * @param {Number} hex - hex value of color to be set
   */
  this.setColourHex = function(hex) {
    this._lod._material.color.setHex(hex);
    if (this._lod._secondaryMaterial) {
      this._lod._secondaryMaterial.color.setHex(hex);
    }
    for (let i = 0; i < labelSets.length; i++) {
      if (labelSets[i]) {
        labelSets[i].setColour(this._lod._material.color);
      }
    }
  }

  /**
   * Set the colour of the pointset and its label
   *
   * @param {THREE.Color} colour - colour to be set
   */
  this.setColour = (colour) => {
    this._lod.setColour(colour);
    for (let i = 0; i < labelSets.length; i++) {
      if (labelSets[i]) {
        labelSets[i].setColour(this._lod._material.color);
      }
    }
  }

  /**
   * Turn size attenuation on/off based on the flag.
   *
   * @param {Boolean} flag - Determin either size attenuation
   * should be on or off.
   */
  this.setLabelDepthTest = (flag) => {
    labelDepthTest = flag;
    for (let i = 0; i < labelSets.length; i++) {
      if (labelSets[i]) {
        labelSets[i].setDepthTest(flag);
      }
    }
  }

  /**
   * Turn size attenuation on/off based on the flag.
   *
   * @param {Number} fontWeightIn - Default value is 700
   */
  this.setLabelFontWeight = (fontWeightIn) => {
    fontWeight = fontWeightIn;
    for (let i = 0; i < labelSets.length; i++) {
      if (labelSets[i]) {
        labelSets[i].setFontWeight(fontWeightIn);
      }
    }
  }

  /**
   * Set the size of the label
   *
   * @param {Number} size - Size to set, default
   * value is 1.
   */
  this.setLabelSize = (size) => {
    labelSize = size;
    for (let i = 0; i < labelSets.length; i++) {
      if (labelSets[i]) {
        labelSets[i].setSize(labelSize);
      }
    }
  }

  /**
   * Set visibility of Labels
   *
   * @param {boolean} flag - default value is true
   */
    this.displayLabels = (flag) => {
      labelVisibility = flag;
      for (let i = 0; i < labelSets.length; i++) {
        if (labelSets[i]) {
          labelSets[i].setVisibility(labelVisibility);
        }
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
        mesh.geometry.computeBoundingBox();
        mesh.geometry.computeBoundingSphere();
        this.boundingBoxUpdateRequired = true;
      }
    }
  }

    /**
   * Delete a vertex in index.
   */
    this.deleteVertices = function(index) {
      let removed = Pointset.prototype.deleteVertices.call(this, index);
      if (removed) {
        removeLabel(index);
      }
      return this.drawRange;
    }

  /**
   * Set the name for this ZincObject.
   *
   * @param {String} groupNameIn - Name to be set.
   */
  this.setName = function(groupNameIn) {
    const oldName = this.groupName;
    Pointset.prototype.setName.call(this, groupNameIn);
    labelSets.forEach(label => {
      if (label.getString() === oldName) {
        label?.setText(groupNameIn);
      }
    })
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

Pointset.prototype = Object.create(ZincObject.prototype);
export { Pointset };
