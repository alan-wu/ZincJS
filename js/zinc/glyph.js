Zinc.Glyph = function(geometry, materialIn, idIn)  {
	var material = materialIn.clone();
	material.vertexColors = THREE.FaceColors;
	var mesh = new THREE.Mesh( geometry, material );
	
	this.id = idIn;
	var _this = this;
	
	this.getMesh = function () {
		return mesh;
	}
	
	this.getBoundingBox = function() {
		if (mesh)
			return new THREE.Box3().setFromObject(mesh);
		return undefined;
	}
	
	this.setColor = function (colorIn) {
		mesh.material.color = colorIn
		mesh.geometry.colorsNeedUpdate = true;
	}
	
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
}
