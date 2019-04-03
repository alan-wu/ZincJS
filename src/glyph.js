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
exports.Glyph = function(geometry, materialIn, idIn, glyphsetIn)  {
	let material = undefined;
	if (materialIn) {
		material = materialIn.clone();
		material.vertexColors = THREE.FaceColors;
	}
	const parent = glyphsetIn;
	let mesh = undefined;
	this.id = idIn;
	this.userData = [];
	const _this = this;
	let label = undefined;
	const group = new THREE.Group();
	const isGlyph = true;
	
	this.fromMesh = meshIn => {
		if (meshIn && meshIn.isMesh) {
			mesh = meshIn.clone();
			mesh.userData = _this;
			group.add(mesh);
			return true;
		} 
		return false;
	}
	
	if (geometry && material) {
		_this.fromMesh(new THREE.Mesh( geometry, material ));
	}
	
	this.setLabel = text => {
	  if (text && (typeof text === 'string' || text instanceof String)) {
		let position = [0, 0, 0];
	    if (label) {
	      position = label.getPosition();
	      group.remove(label.getSprite());
	      label.dispose();
	      label = undefined;
	    }
	    label = new (require('./label').Label)(text);
	    label.setPosition(position[0], position[1], position[2]);
	    group.add(label.getSprite());
	  }
	}
	
	/**
	 * Get the group containing the label and mesh.
	 * @return {THREE.Mesh}
	 */
	this.getGroup = () => {
		return group;
	}
	
	/**
	 * Get the label of this glyph
	 * @return {Label}
	 */
	this.getLabel = () => {
		if (label)
			return label.getString();
		return undefined;
	}
  
	/**
	 * Get the mesh of this glyph.
	 * @return {THREE.Mesh}
	 */
	this.getMesh = () => {
		return mesh;
	}
	
	/**
	 * Get the bounding box of this glyph.
	 * @return {THREE.Box3}
	 */
	this.getBoundingBox = () => {
		if (mesh)
			return new THREE.Box3().setFromObject(mesh);
		return undefined;
	}
	
	/**
	 * get the Colour of this glyph.
	 * return {THREE.Color}
	 */
	this.getColor = colorIn => {
		if (mesh && mesh.material)
			return mesh.material;
		return undefined;
	}
	
	/**
	 * Set the Colour of this glyph.
	 * @param {THREE.Color} colorIn - Colour to be set of this mesh.
	 */
	this.setColor = colorIn => {
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
	this.setTransformation = (position, axis1, axis2, axis3) => {
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
		if (label)
		  label.setPosition(position[0],  position[1], position[2]);
	}
	
	/**
	 * Clear and free its memory.
	 */
	this.dispose = () => {
	  if (_this.material)
	    _this.material.dispose();
		_this.mesh = undefined;
	}
}
