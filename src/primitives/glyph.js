const THREE = require('three');

/**
 * Zinc representation of glyph graphic, it contains the colours, 
 * geometry and transformation of the glyph.
 * 
 * @param {THREE.Geometry} geometry - Geometry of the glyph.
 * @param {THREE.material} materialIn - Material of the glyph.
 * @param {Number} idIn - Id of the glyph.
 * 
 * @class
 * @author Alan Wu
 * @return {Zinc.Glyph}
 */
const Glyph = function(geometry, materialIn, idIn, glyphsetIn)  {
  (require('./zincObject').ZincObject).call(this);
	let material = undefined;
	if (materialIn) {
		material = materialIn.clone();
		material.vertexColors = THREE.FaceColors;
	}
	const parent = glyphsetIn;
	this.id = idIn;
	let label = undefined;
	let labelString = undefined;
	const group = new THREE.Group();
	this.isGlyph = true;
	
	this.fromMesh = meshIn => {
		if (meshIn && meshIn.isMesh) {
			this.morph = meshIn.clone();
			this.morph.userData = this;
			group.add(this.morph);
			return true;
		} 
		return false;
	}
	
	if (geometry && material) {
		this.fromMesh(new THREE.Mesh( geometry, material ));
	}
	
	this.getGlyphset = function() {
		return parent;
	}
	
	this.setLabel = text => {
		if (text && (typeof text === 'string' || text instanceof String)) {
			labelString = text;
			if (this.morph)
      this.morph.name = text;
		}
		if (label)
			this.showLabel();
	}	
	
	this.showLabel = (colour) => {
	  if (label) {
		  position = label.getPosition();
		  group.remove(label.getSprite());
		  label.dispose();
		  label = undefined;
    }
	  if (labelString && (typeof labelString === 'string' || labelString instanceof String)) {
		  let position = [0, 0, 0];
	    label = new (require('./label').Label)(labelString, colour);
	    label.setPosition(position[0], position[1], position[2]);
	    group.add(label.getSprite());
	  }
	}
	
	/**
	 * Get the group containing the label and mesh.
	 * @return {THREE.Group}
	 */
	this.getGroup = () => {
		return group;
	}
	
	/**
	 * Get the label of this glyph
	 * @return {Label}
	 */
	this.getLabel = () => {
		return labelString;
	}
  
	/**
	 * Get the mesh of this glyph.
	 * @return {THREE.Mesh}
	 */
	this.getMesh = () => {
		return this.morph;
  }

  /**
   * Get the bounding box of this geometry.
   * 
   * @return {THREE.Box3}.
   */
  this.getBoundingBox = function() {
    if (this.morph)
      return new THREE.Box3().setFromObject(
        this.morph);
    return undefined;
  }

	/**
	 * Set the transformation of this glyph.
	 * @param {Array} position - Three components vectors containing position of the
	 * transformation.
	 * @param {Array} axis1 - Three components vectors containing axis1 rotation of the
	 * transformation.
	 * @param {Array} axis2 - Three components vectors containing axis2 rotation of the
	 * transformation.
	 * @param {Array} position - Three components vectors containing axis3 rotation of the
	 * transformation.
	 */
	this.setTransformation = (position, axis1, axis2, axis3) => {
    if (this.morph) {
      this.morph.matrix.elements[0] = axis1[0];spriteMaterial
      this.morph.matrix.elements[1] = axis1[1];spriteMaterial
      this.morph.matrix.elements[2] = axis1[2];spriteMaterial
      this.morph.matrix.elements[3] = 0.0;
      this.morph.matrix.elements[4] = axis2[0];spriteMaterial
      this.morph.matrix.elements[5] = axis2[1];spriteMaterial
      this.morph.matrix.elements[6] = axis2[2];
      this.morph.matrix.elements[7] = 0.0;
      this.morph.matrix.elements[8] = axis3[0];
      this.morph.matrix.elements[9] = axis3[1];
      this.morph.matrix.elements[10] = axis3[2];
      this.morph.matrix.elements[11] = 0.0;
      this.morph.matrix.elements[12] = position[0];
      this.morph.matrix.elements[13] = position[1];
      this.morph.matrix.elements[14] = position[2];
      this.morph.matrix.elements[15] = 1.0;
      this.morph.matrixAutoUpdate = false;
    }
		if (label)
		  label.setPosition(position[0],  position[1], position[2]);
	}
  
  this.setColour = (color) => {
    if (label)
      label.setColour(color);
    if (this.secondaryMesh && this.secondaryMesh.material)
      this.secondaryMesh.material.color = colour;
    this.geometry.colorsNeedUpdate = true;
  }

	/**
	 * Clear and free its memory.
	 */
	this.dispose = () => {
	  if (this.material)
	    this.material.dispose();
		this.morph = undefined;
	}
}

Glyph.prototype = Object.create((require('./zincObject').ZincObject).prototype);
exports.Glyph = Glyph;
