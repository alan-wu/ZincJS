const THREE = require('three');

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
	this.userData = [];
	
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
			geometry.colorsNeedUpdate = true;
			const texture = getCircularTexture();
			material.map = texture;
			this.morph = new THREE.Points(geometry, material);
			if (this.morph) {
				this.morph.userData = this;
				this.morph.name = this.groupName;
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


}