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
exports.Pointset = function () {
	this.morph = undefined;
	this.groupName = undefined;
	this.timeEnabled = false;
	this.morphColour = false;
	this.isPointset = true;
	let inbuildTime = 0;
	/**
	 * Total duration of the animation, this value interacts with the 
	 * {@link Zinc.Renderer#playRate} to produce the actual duration of the
	 * animation. Actual time in second = duration / playRate.
	 */
	this.duration = 3000;
	this.clipAction = undefined;
	this.userData = [];
	
	
	const updateMorphTargets = geometry => {
		var m, ml, name;
		var morphTargets = geometry.morphTargets;
		if ( morphTargets !== undefined && morphTargets.length > 0 ) {
			this.morph.morphTargetInfluences = [];
			this.morph.morphTargetDictionary = {};
			for ( m = 0, ml = morphTargets.length; m < ml; m ++ ) {
				name = morphTargets[ m ].name || String( m );
				this.morph.morphTargetInfluences.push( 0 );
				this.morph.morphTargetDictionary[ name ] = m;
			}
		}
	}

	this.setFrustumCulled = flag => {
		if (this.morph)
			this.morph.frustumCulled = flag;
	}
	
	const updateBufferGeometry = (object, geometry) => {
		if (object && geometry) {
			if ( geometry._bufferGeometry === undefined ) {
				geometry._bufferGeometry = new THREE.BufferGeometry().fromGeometry( geometry );
			}
		}
	}
			
	const getCircularTexture = () => {
		var image = new Image();
		image.src = require("./assets/disc.png");
		const texture = new THREE.Texture();
		texture.image = image;
		texture.needsUpdate = true;
		return texture;
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

	  this.createMesh = (geometry, material) => {
		  if (geometry && material) {
			  let k = 0;
			  if (material.vertexColors === THREE.VertexColors) {
				  if (geometry.faces.length > 0 && geometry.faces[i].vertexColors.length > 0) {
					  material.color = new THREE.Color(1, 1, 1);
					  for (let i = 0; i < geometry.faces.length; i++) {
						  for (let j = 0; j < geometry.faces[i].vertexColors.length; j++) {
							  geometry.colors.push(geometry.faces[i].vertexColors[j]);
							  k++;
						  }
					  }
					  if (geometry.vertices.length > k) {
						  for (k;k < geometry.vertices.length; k++)
							  geometry.colors.push(new THREE.Color(0,0,0));
					  }
				  } else {
					  material.vertexColors = THREE.NoColors;
				  }
			  }
			  geometry.colorsNeedUpdate = true;
			  const texture = getCircularTexture();
			  material.map = texture;
			  this.morph = new Points(geometry, material);
			  if (this.morph) {
				  this.morph.userData = this;
				  this.morph.name = this.groupName;
				  this.mixer = new THREE.AnimationMixer(this.morph);
				  this.clipAction = undefined;
				  if (geometry.morphTargets) {
					  updateMorphTargets(geometry);
					  const animationClip = THREE.AnimationClip.CreateClipsFromMorphTargetSequences(geometry.morphTargets, 10, true);
					  if (animationClip && animationClip[0] != undefined) {
						  this.clipAction = this.mixer.clipAction(animationClip[0]).setDuration(this.duration);
						  this.clipAction.loop = THREE.loopOnce;
						  this.clipAction.clampWhenFinished = true;
						  this.clipAction.play();
					  }
					  updateBufferGeometry(this.morph, geometry);
				  }
			  }
		  }
		  return this.morph;		
	  }

	this.setSize = size => {
		if (this.morph && this.morph.material) {
			this.morph.material.size = size;
			material.needsUpdate = true;
		}
	}
	
	this.setSizeAttenuation = flag => {
		if (this.morph && this.morph.material) {
			this.morph.material.sizeAttenuation = flag;
			material.needsUpdate = true;
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
		if (this.morph.visible) {
			this.morph.geometry.computeBoundingBox();
			return this.morph.geometry.boundingBox;
		}
		return undefined;
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