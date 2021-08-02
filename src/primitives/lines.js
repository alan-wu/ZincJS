const THREE = require('three');
/**
 * Provides an object which stores points and provides method which controls its position.
 * This is created when a valid json file containing point is read into a {@link Zinc.Scene}
 * object.
 * 
 * @class
 * @author Alan Wu
 * @return {Zinc.Lines}
 */
const Lines = function () {
  (require('./zincObject').ZincObject).call(this);
	this.isLines = true;

	this.createLineSegment = (geometryIn, materialIn, options) => {
		if (geometryIn && materialIn) {
			let geometry = this.toBufferGeometry(geometryIn, options);
      let line = new (require("../three/line/LineSegments").LineSegments)(geometry, materialIn);
			this.setMesh(line, options.localTimeEnabled, options.localMorphColour);
		}		
	}

	this.setWidth = width => {
		if (this.morph && this.morph.material) {
			this.morph.material.linewidth = width;
			this.morph.material.needsUpdate = true;
		}
	}

}

Lines.prototype = Object.create((require('./zincObject').ZincObject).prototype);
exports.Lines = Lines;
