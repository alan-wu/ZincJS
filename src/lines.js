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
exports.Lines = function () {
	this.morph = undefined;
	this.groupName = undefined;
	this.timeEnabled = false;
	this.morphColour = false;
	this.isLines = true;
	let inbuildTime = 0;
	/**
	 * Total duration of the animation, this value interacts with the 
	 * {@link Zinc.Renderer#playRate} to produce the actual duration of the
	 * animation. Actual time in second = duration / playRate.
	 */
	this.duration = 3000;
	this.clipAction = undefined;
	this.userData = [];
	
	this.setFrustumCulled = flag => {
		if (this.morph)
			this.morph.frustumCulled = flag;
	}
		
	/**
	 * Check if the pointset is time varying.
	 * 
	 * @return {Boolean}
	 */
	this.isTimeVarying = () => {
	if (this.timeEnabled || this.morphColour)
		return true;
	return false;
	}

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

	this.setName = groupNameIn => {
		this.groupName = groupNameIn;
		if (this.morph) {
			this.morph.name = this.groupName;
		}
	}
	
	/**
	 * Set the visibility of this pointset.
	 * @param {Boolean} flag - visibility to be set for this pointset.
	 */
	this.setVisibility = flag => {
		this.morph.visible = flag;
	}
	
	/**
	 * Get the bounding box for the whole set of glyphs.
	 * 
	 * @return {Three.Box3};
	 */
	this.getBoundingBox = () => {
		if (this.morph && this.morph.visible) {
			var boundingBox = new THREE.Box3();
			this.morph.geometry.computeBoundingBox();
			boundingBox.copy(this.morph.geometry.boundingBox);
			if (this.timeEnabled) {
				var morphTargets = this.morph.geometry.morphTargets;
				if (morphTargets) {
					for ( var t = 0, tl = morphTargets.length; t < tl; t ++ ) {
						var targets = morphTargets[ t ].vertices;
						var newBox = new THREE.Box3().setFromPoints(targets);
						boundingBox.union(newBox);
					}
				}
			}
			return boundingBox;
		}
	}
	
	/**
	 * Get the local time of this geometry, it returns a value between 
	 * 0 and the duration.
	 * 
	 * @return {Number}
	 */
	this.getCurrentTime = () => {
		if (this.clipAction) {
			const ratio = this.clipAction.time / this.clipAction._clip.duration;
			return this.duration * ratio;
		} else {
			return inbuildTime;
		}
	}

	/**
	 * Set the local time of this geometry.
	 * 
	 * @param {Number} time - Can be any value between 0 to duration.
	 */
	this.setMorphTime = time => {
		if (this.clipAction) {
			const ratio = time / this.duration;
			const actualDuration = this.clipAction._clip.duration;
			this.clipAction.time = ratio * actualDuration;
			if (this.clipAction.time > actualDuration)
				this.clipAction.time = actualDuration;
			if (this.clipAction.time < 0.0)
				this.clipAction.time = 0.0;
			if (this.timeEnabled == 1)
				this.mixer.update( 0.0 );
		} else {
			if (time > this.duration)
				inbuildTime = this.duration;
			else if (0 > time)
				inbuildTime = 0;
			else
				inbuildTime = time;
		}
		if (this.morphColour == 1) {
			if (typeof this.geometry !== "undefined") {
				if (this.morph.material.vertexColors == THREE.VertexColors)
				{
					morphColorsToVertexColors(this.geometry, this.morph, this.clipAction)
				}
				this.geometry.colorsNeedUpdate = true;
			}
		}
	}

	/**
	 * Check if the geometry is time varying.
	 * 
	 * @return {Boolean}
	 */
	this.isTimeVarying = () => {
		if (this.timeEnabled || this.morphColour)
			return true;
		return false;
	}

		/**
	 * Clear this geometry and free the memory.
	 */
	this.dispose = () => {
		if (this.morph && this.morph.geometry)
		  this.morph.geometry.dispose();
		if (this.morph && this.morph.material)
		  this.morph.material.dispose();
		this.geometry = undefined;
		this.mixer = undefined;
		this.morph = undefined;
		this.clipAction = undefined;
		this.groupName = undefined;
	}

	//Update the geometry and colours depending on the morph.
	this.render = (delta, playAnimation) => {
		if (playAnimation == true) 
		{
			if ((this.clipAction) && (this.timeEnabled == 1)) {
				this.mixer.update( delta );
			}
			else {
				let targetTime = inbuildTime + delta;
				if (targetTime > this.duration)
					targetTime = targetTime - this.duration;
				inbuildTime = targetTime;
			}
			if (this.morphColour == 1) {
				if (typeof this.geometry !== "undefined") {
					
					if (this.morph.material.vertexColors == THREE.VertexColors)
					{
						let clipAction = undefined;
						if (this.clipAction && (this.timeEnabled == 1))
							clipAction = this.clipAction;
						morphColorsToVertexColors(this.geometry, this.morph, clipAction);
						this.geometry.colorsNeedUpdate = true;
					}
					
				}
			}	
		}
	}

}