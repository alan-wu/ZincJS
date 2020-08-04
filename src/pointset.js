const THREE = require('three');
const Points = require('./Points').Points;
/**
 * Provides an object which stores points and provides method which controls its position.
 * This is created when a valid json file containing point is read into a {@link Zinc.Scene}
 * object.
 * 
 * @class
 * @author Alan Wu
 * @return {Zinc.Geometry}
 */
const Pointset = function () {
  (require('./primitives/zincObject').ZincObject).call(this);
	this.isPointset = true;

    /** Shape of the points is created using the function below */
	const getCircularTexture = () => {
		var image = new Image();
		image.src = require("./assets/disc.png");
		const texture = new THREE.Texture();
		texture.image = image;
		texture.needsUpdate = true;
		return texture;
	}

	this.createMesh = (geometryIn, materialIn, options) => {
		if (geometryIn && materialIn) {
			let geometry = this.toBufferGeometry(geometryIn, options);
			const texture = getCircularTexture();
			materialIn.map = texture;
			let point = new Points(geometry, materialIn);
			this.setMesh(point, options.localTimeEnabled, options.localMorphColour);
		}	
	}

	this.setSize = size => {
		if (this.morph && this.morph.material) {
			this.morph.material.size = size;
			this.morph.material.needsUpdate = true;
		}
	}
	
	this.setSizeAttenuation = flag => {
		if (this.morph && this.morph.material) {
			this.morph.material.sizeAttenuation = flag;
			this.morph.material.needsUpdate = true;
		}
	}
}

Pointset.prototype = Object.create((require('./primitives/zincObject').ZincObject).prototype);
exports.Pointset = Pointset;
