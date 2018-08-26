var THREE = require('three');

/**
 * Zinc representation of glyph graphic, it contains the colours, 
 * geometry and transformation of the glyph.
 * 
 * @param {THREE.Geometry} geometry - Geometry of the glyph.
 * @param {THREE.material} materialIn - Material of the glyph.
 * @param {Number} idIn - Ud of the glyph.
 * 
 * @class
 * @author Alan Wu
 * @return {Zinc.Glyph}
 */
exports.Glyph = function(geometry, materialIn, idIn, glyphsetIn)  {
	var material = materialIn.clone();
	var parent = glyphsetIn;
	material.vertexColors = THREE.FaceColors;
	var mesh = new THREE.Mesh( geometry, material );
	this.id = idIn;
	this.userData = [];
	var _this = this;
	mesh.userData = _this;
	
	/**
	 * Get the mesh of this glyph.
	 * @return {THREE.Mesh}
	 */
	this.getMesh = function () {
		return mesh;
	}
	
	/**
	 * Get the bounding box of this glyph.
	 * @return {THREE.Box3}
	 */
	this.getBoundingBox = function() {
		if (mesh)
			return new THREE.Box3().setFromObject(mesh);
		return undefined;
	}
	
	/**
	 * Set the Colour of this glyph.
	 * @param {THREE.Color} colorIn - Colour to be set of this mesh.
	 */
	this.setColor = function (colorIn) {
		mesh.material.color = colorIn;
		mesh.geometry.colorsNeedUpdate = true;
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
	this.setTransformation = function(position, axis1, axis2, axis3) {
		mesh.matrix.elements[0] = axis1[0];
		mesh.matrix.elements[1] = axis1[1];
		mesh.matrix.elements[2] = axis1[2];
		mesh.matrix.elements[3] = 0.0;
		mesh.matrix.elements[4] = axis2[0];
		mesh.matrix.elements[5] = axis2[1];
		mesh.matrix.elements[6] = axis2[2];
		mesh.matrix.elements[7] = 0.0;
		mesh.matrix.elements[8] = axis3[0];
		mesh.matrix.elements[9] = axis3[1];
		mesh.matrix.elements[10] = axis3[2];
		mesh.matrix.elements[11] = 0.0;
		mesh.matrix.elements[12] = position[0];
		mesh.matrix.elements[13] = position[1];
		mesh.matrix.elements[14] = position[2];
		mesh.matrix.elements[15] = 1.0;
		mesh.matrixAutoUpdate = false;
	}
	
	/**
	 * Clear and free its memory.
	 */
	this.dispose = function() {
	  if (_this.material)
	    _this.material.dispose();
		_this.mesh = undefined;
	}
}
