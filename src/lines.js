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
  (require('./primitives/zincObject').ZincObject).call(this);
	this.isLines = true;

	this.setLine = (line, localTimeEnabled, localMorphColour) => {
		this.mixer = new THREE.AnimationMixer(line);
		this.geometry = line.geometry;
		this.clipAction = undefined;
		if (this.geometry.morphAttributes.position) {
			let animationClip = THREE.AnimationClip.CreateClipsFromMorphTargetSequences(
				  this.geometry.morphAttributes.position, 10, true);
			if (animationClip && animationClip[0] != undefined) {
			  this.clipAction = this.mixer.clipAction(animationClip[0]).setDuration(this.duration);
			  this.clipAction.loop = THREE.loopOnce;
			  this.clipAction.clampWhenFinished = true;
			  this.clipAction.play();
			}
		}
		this.timeEnabled = localTimeEnabled;
		this.morphColour = localMorphColour;
		this.morph = line;
		this.morph.userData = this;
		if (this.timeEnabled)
			this.setFrustumCulled(false);
	}

	this.createLineSegment = (geometryIn, materialIn, options) => {
		if (geometryIn && materialIn) {
			let geometry = undefined;
			if (geometryIn instanceof THREE.Geometry) {
				geometry = new THREE.BufferGeometry().fromGeometry(geometryIn);
				if (options.localMorphColour)
					require("./utilities").copyMorphColorsToBufferGeometry(geometryIn, geometry);
			} else if (geometryIn instanceof THREE.BufferGeometry) {
				geometry = new THREE.BufferGeometry();
				geometry.copy(geometryIn);
			}
			geometry.colorsNeedUpdate = true;
			let line = new (require("./line/LineSegments").LineSegments)(geometry, materialIn);
			this.setLine(line, options.localTimeEnabled, options.localMorphColour);
		}		
	}

	this.setWidth = width => {
		if (this.morph && this.morph.material) {
			this.morph.material.linewidth = width;
			this.morph.material.needsUpdate = true;
		}
	}

}

Lines.prototype = Object.create((require('./primitives/zincObject').ZincObject).prototype);
exports.Lines = Lines;
