const THREE = require('three');

/**
 * Provides an object which stores geometry and provides method which controls its animations.
 * This is created when a valid json file containging geometry is read into a {@link Zinc.Scene}
 * object.
 * 
 * @class
 * @author Alan Wu
 * @return {Zinc.Geometry}
 */
exports.Geometry = function () {
	// THREE.Geometry or THREE.BufferGeometry
	this.geometry = undefined;
	this.mixer = undefined;
	this.timeEnabled = false;
	this.morphColour = false;
	this.modelId = -1;
	// THREE.Mesh
	this.morph = undefined;
	this.clipAction = undefined;
	this.isGeometry = true;
	/**
	 * Total duration of the animation, this value interacts with the 
	 * {@link Zinc.Renderer#playRate} to produce the actual duration of the
	 * animation. Actual time in second = duration / playRate.
	 */
	this.duration = 3000;
	/**
	 * Groupname given to this geometry.
	 */
	this.groupName = undefined;
	let inbuildTime = 0;
	this.userData = [];
	
	/**
	 * Set the visibility of this Geometry.
	 * 
	 * @param {Boolean} visible - a boolean flag indicate the visibility to be set 
	 */
	this.setVisibility = visible => {
		this.morph.visible = visible;
	}
	
	/**
	 * Set the opacity of this Geometry. This function will also set the isTransparent
	 * flag according to the provided alpha value.
	 * 
	 * @param {Number} alpah - Alpha value to set for this geometry, 
	 * can be any value between from 0 to 1.0.
	 */
	this.setAlpha = alpha => {
		const material = this.morph.material;
		let isTransparent = false;
		if (alpha  < 1.0)
			isTransparent = true;
		material.transparent = isTransparent;
		material.opacity = alpha;
	}

	this.setFrustumCulled = flag => {
		if (this.morph)
			this.morph.frustumCulled = flag;
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
	
	this.calculateUVs = () => {
		this.geometry.computeBoundingBox();
		const max = this.geometry.boundingBox.max, min = this.geometry.boundingBox.min;
		const offset = new THREE.Vector2(0 - min.x, 0 - min.y);
		const range = new THREE.Vector2(max.x - min.x, max.y - min.y);
		this.geometry.faceVertexUvs[0] = [];
		for (let i = 0; i < this.geometry.faces.length ; i++) {
		    const v1 = this.geometry.vertices[this.geometry.faces[i].a];
		    const v2 = this.geometry.vertices[this.geometry.faces[i].b];
		    const v3 = this.geometry.vertices[this.geometry.faces[i].c];
		    geometry.faceVertexUvs[0].push(
		        [
		            new THREE.Vector2((v1.x + offset.x)/range.x ,(v1.y + offset.y)/range.y),
		            new THREE.Vector2((v2.x + offset.x)/range.x ,(v2.y + offset.y)/range.y),
		            new THREE.Vector2((v3.x + offset.x)/range.x ,(v3.y + offset.y)/range.y)
		        ]);
		}
		geometry.uvsNeedUpdate = true;	
	}
	
	/**
	 * Set wireframe display for this geometry.
	 * 
	 * @param {Boolean} wireframe - Flag to turn on/off wireframe display.
	 */
	this.setWireframe = wireframe => {
		this.morph.material.wireframe = wireframe;
	}
	
	this.setVertexColors = vertexColors => {
		this.morph.material.vertexColors = vertexColors;
		this.geometry.colorsNeedUpdate = true;
	}
	
	/**
	 * Set the colour of the geometry.
	 * 
	 * @param {THREE.Color} colour - Colour to be set for this geometry.
	 */
	this.setColour = colour => {
		this.morph.material.color = colour;
		this.geometry.colorsNeedUpdate = true;
	}
	
	/**
	 * Set the material of the geometry.
	 * 
	 * @param {THREE.Material} material - Material to be set for this geometry.
	 */
	this.setMaterial = material => {
		this.morph.material = material;
		this.geometry.colorsNeedUpdate = true;
	}
	
	//Get the colours at index		this = undefined;	
	getColorsRGB = (colors, index) => {
		const index_in_colors = Math.floor(index/3);
		const remainder = index%3;
		let hex_value = 0;
		if (remainder == 0)
		{
			hex_value = colors[index_in_colors].r;
		}
		else if (remainder == 1)
		{
			hex_value = colors[index_in_colors].g;
		}
		else if (remainder == 2)
		{
			hex_value = colors[index_in_colors].b;
		}
		const mycolor = new THREE.Color(hex_value);
		return [mycolor.r, mycolor.g, mycolor.b];
	}
	
	//Calculate the interpolated colour at current time
	const morphColorsToVertexColors = (targetGeometry, morph, clipAction) => {
		if ( morph && targetGeometry.morphColors && targetGeometry.morphColors.length) {
			let current_time = 0.0;
			if (clipAction)
				current_time = clipAction.time/clipAction._clip.duration * (targetGeometry.morphColors.length - 1);
			else
				current_time = inbuildTime/this.duration * (targetGeometry.morphColors.length - 1);
			
			const bottom_frame =  Math.floor(current_time);
			const proportion = 1 - (current_time - bottom_frame);
			const top_frame =  Math.ceil(current_time);
			const bottomColorMap = targetGeometry.morphColors[ bottom_frame ];
			const TopColorMap = targetGeometry.morphColors[ top_frame ];
			
			for ( let i = 0; i < targetGeometry.faces.length; i ++ ) {
				let my_color1 = getColorsRGB(bottomColorMap.colors, targetGeometry.faces[i].a);
				let my_color2 = getColorsRGB(TopColorMap.colors, targetGeometry.faces[i].a);
				let resulting_color = [my_color1[0] * proportion + my_color2[0] * (1 - proportion),
					my_color1[1] * proportion + my_color2[1] * (1 - proportion),
					my_color1[2] * proportion + my_color2[2] * (1 - proportion)];
				targetGeometry.faces[i].vertexColors[0].setRGB(resulting_color[0], resulting_color[1], resulting_color[2])
				my_color1 = getColorsRGB(bottomColorMap.colors, targetGeometry.faces[i].b);
				my_color2 = getColorsRGB(TopColorMap.colors, targetGeometry.faces[i].b);
				resulting_color = [my_color1[0] * proportion + my_color2[0] * (1 - proportion),
					my_color1[1] * proportion + my_color2[1] * (1 - proportion),
					my_color1[2] * proportion + my_color2[2] * (1 - proportion)]
				targetGeometry.faces[i].vertexColors[1].setRGB(resulting_color[0], resulting_color[1], resulting_color[2])
				my_color1 = getColorsRGB(bottomColorMap.colors, targetGeometry.faces[i].c);
				my_color2 = getColorsRGB(TopColorMap.colors, targetGeometry.faces[i].c);
				resulting_color = [my_color1[0] * proportion + my_color2[0] * (1 - proportion),
					my_color1[1] * proportion + my_color2[1] * (1 - proportion),
					my_color1[2] * proportion + my_color2[2] * (1 - proportion)]
				targetGeometry.faces[i].vertexColors[2].setRGB(resulting_color[0], resulting_color[1], resulting_color[2])
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
	 * Get the bounding box of this geometry.
	 * 
	 * @return {THREE.Box3}.
	 */
	this.getBoundingBox = () => {
		if (this.morph) {
			return new THREE.Box3().setFromObject(this.morph);
		}
		return undefined;
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
