const THREE = require('three');
const JSONLoader = require('../loader').JSONLoader;

/**
 * This is a container of {@link Zinc.Glyph} and their graphical properties 
 * including transformations, colors, number of time steps, duration of animations
 * and group name. Please note that all glyphs in the glyphset share the same geometry
 * however they may have different transformations.
 * 
 * @class
 * @author Alan Wu
 * @return {Zinc.Glyphset}
 */
const Glyphset = function()  {
  (require('./zincObject').ZincObject).call(this);
	const glyphList = [];
	let axis1s = undefined;
	let axis2s = undefined;
	let axis3s = undefined;
	let positions = undefined;
	let scales = undefined;
	let colors = undefined;
	let labels = undefined;
	let numberOfTimeSteps = 0;
	let numberOfVertices = 0;
	let baseSize = [0, 0, 0];
	let offset = [0, 0, 0];
	let scaleFactors = [ 0, 0, 0 ];
	let repeat_mode = "NONE";
	this.ready = false;
	const group = new THREE.Group();
	let morphColours = false;
	let morphVertices = false;
	this.isGlyphset = true;
	
	/**
	 * Get the {@link Three.Group} containing all of the glyphs' meshes.
	 * @returns {Three.Group}
	 */
	this.getGroup = () => {
		return group;
  }
  
  /**
	 * Get the visibility of this glyphset.
	 */
	this.getVisibility = () => {
	  return	group.visible;
	}
	
	/**
	 * Set the visibility of this glyphset.
	 * @param {Boolean} flag - visibility to be set for this glyphset.
	 */
	this.setVisibility = flag => {
		group.visible = flag;
	}
	
	/**
	 * Copy glyphset data into this glyphset then load the glyph's geoemtry 
	 * with the provided glyphURL. FinishCallback will be called once
	 * glyph is loaded.
	 * 
	 * @param {Array} glyphsetData - contains the informations about the glyphs.
	 * @param {String} glyphURL - URL to the geometry which will be applied to all
	 * all the glyphs in the glyphset once loaded.
	 * @param {Function} finishCallback - User's function to be called once glyph's
	 * geometry is loaded.
	 */
	this.load = (glyphsetData, glyphURL, finishCallback, isInline) => {
		axis1s = glyphsetData.axis1;
		axis2s = glyphsetData.axis2;
		axis3s = glyphsetData.axis3;
		positions = glyphsetData.positions;
		scales = glyphsetData.scale;
		colors = glyphsetData.colors;
		labels = glyphsetData.label;
		morphColours = glyphsetData.metadata.MorphColours;
		morphVertices = glyphsetData.metadata.MorphVertices;
		numberOfTimeSteps = glyphsetData.metadata.number_of_time_steps;
		repeat_mode = glyphsetData.metadata.repeat_mode;
		numberOfVertices = glyphsetData.metadata.number_of_vertices;
		if (repeat_mode == "AXES_2D" || repeat_mode == "MIRROR")
			numberOfVertices = numberOfVertices * 2;
		else if (repeat_mode == "AXES_3D")
			numberOfVertices = numberOfVertices * 3;
		baseSize = glyphsetData.metadata.base_size;
		offset = glyphsetData.metadata.offset;
		scaleFactors = glyphsetData.metadata.scale_factors;
    const loader = new JSONLoader();
    if (isInline) {
      var object = loader.parse( glyphURL );
      (meshloader(finishCallback))( object.geometry, object.materials );
    } else {
      loader.crossOrigin = "Anonymous";
      loader.load( glyphURL, meshloader(finishCallback));
    }
	}
	
	/**
	 * Calculate the actual transformation value that can be applied 
	 * to the transformation matrix.
	 * @returns {Array}
	 */
	const resolve_glyph_axes = (point, axis1, axis2, axis3, scale) => {
		const return_arrays = [];
		if (repeat_mode == "NONE" || repeat_mode == "MIRROR")
		{
			let axis_scale = [0.0, 0.0, 0.0];
			let final_axis1 = [0.0, 0.0, 0.0];
			let final_axis2 = [0.0, 0.0, 0.0];
			let final_axis3 = [0.0, 0.0, 0.0];
			let final_point = [0.0, 0.0, 0.0];
			const mirrored_axis1 = [0.0, 0.0, 0.0];
			const mirrored_axis2 = [0.0, 0.0, 0.0];
			const mirrored_axis3 = [0.0, 0.0, 0.0];
			const mirrored_point = [0.0, 0.0, 0.0];
			for (var j = 0; j < 3; j++)
			{
				var sign = (scale[j] < 0.0) ? -1.0 : 1.0;
				axis_scale[j] = sign*baseSize[j] + scale[j]*scaleFactors[j];
			}
			for (var j = 0; j < 3; j++)
			{
				final_axis1[j] = axis1[j]*axis_scale[0];
				final_axis2[j] = axis2[j]*axis_scale[1];
				final_axis3[j] = axis3[j]*axis_scale[2];
				final_point[j] = point[j]
					+ offset[0]*final_axis1[j]
					+ offset[1]*final_axis2[j]
					+ offset[2]*final_axis3[j];
				if (repeat_mode == "MIRROR")
				{
					mirrored_axis1[j] = -final_axis1[j];
					mirrored_axis2[j] = -final_axis2[j];
					mirrored_axis3[j] = -final_axis3[j];
					mirrored_point[j] = final_point[j];
					if (scale[0] < 0.0)
					{
						// shift glyph origin to end of axis1 
						final_point[j] -= final_axis1[j];
						mirrored_point[j] -= mirrored_axis1[j];
					}
				}
			}
			/* if required, reverse axis3 to maintain right-handed coordinate system */
			if (0.0 > (
				final_axis3[0]*(final_axis1[1]*final_axis2[2] -
					final_axis1[2]*final_axis2[1]) +
				final_axis3[1]*(final_axis1[2]*final_axis2[0] -
					final_axis1[0]*final_axis2[2]) +
				final_axis3[2]*(final_axis1[0]*final_axis2[1] -
					final_axis1[1]*final_axis2[0])))
			{
				final_axis3[0] = -final_axis3[0];
				final_axis3[1] = -final_axis3[1];
				final_axis3[2] = -final_axis3[2];
			}
			return_arrays.push([final_point, final_axis1, final_axis2, final_axis3]);
			if (repeat_mode == "MIRROR")
			{
				if (0.0 > (
					mirrored_axis3[0]*(mirrored_axis1[1]*mirrored_axis2[2] -
						mirrored_axis1[2]*mirrored_axis2[1]) +
					mirrored_axis3[1]*(mirrored_axis1[2]*mirrored_axis2[0] -
						mirrored_axis1[0]*mirrored_axis2[2]) +
					mirrored_axis3[2]*(mirrored_axis1[0]*mirrored_axis2[1] -
						mirrored_axis1[1]*mirrored_axis2[0])))
				{
					mirrored_axis3[0] = -mirrored_axis3[0];
					mirrored_axis3[1] = -mirrored_axis3[1];
					mirrored_axis3[2] = -mirrored_axis3[2];
				}
				return_arrays.push([mirrored_point, mirrored_axis1, mirrored_axis2, mirrored_axis3]);
			}
		}
		else if (repeat_mode == "AXES_2D" || repeat_mode == "AXES_3D")
		{
			let axis_scale = [0.0, 0.0, 0.0];
			let final_point = [0.0, 0.0, 0.0];
			for (var j = 0; j < 3; j++)
			{
				var sign = (scale[j] < 0.0) ? -1.0 : 1.0;
				axis_scale[j] = sign*baseSize[0] + scale[j]*scaleFactors[0];
			}
			for (var j = 0; j < 3; j++)
			{
				final_point[j] = point[j]
					+ offset[0]*axis_scale[0]*axis1[j]
					+ offset[1]*axis_scale[1]*axis2[j]
					+ offset[2]*axis_scale[2]*axis3[j];
			}
			const number_of_glyphs = (glyph_repeat_mode == "AXES_2D") ? 2 : 3;
			for (let k = 0; k < number_of_glyphs; k++)
			{
				let use_axis1, use_axis2;
				const use_scale = scale[k];
				let final_axis1 = [0.0, 0.0, 0.0];
				let final_axis2 = [0.0, 0.0, 0.0];
				let final_axis3 = [0.0, 0.0, 0.0];
				if (k == 0)
				{
					use_axis1 = axis1;
					use_axis2 = axis2;
				}
				else if (k == 1)
				{
					use_axis1 = axis2;
					use_axis2 = (glyph_repeat_mode == "AXES_2D") ? axis1 : axis3;
				}
				else // if (k == 2)
				{
					use_axis1 = axis3;
					use_axis2 = axis1;
				}	
				const final_scale1 = baseSize[0] + use_scale*scaleFactors[0];
				final_axis1[0] = use_axis1[0]*final_scale1;
				final_axis1[1] = use_axis1[1]*final_scale1;
				final_axis1[2] = use_axis1[2]*final_scale1;
				final_axis3[0] = final_axis1[1]*use_axis2[2] - use_axis2[1]*final_axis1[2];
				final_axis3[1] = final_axis1[2]*use_axis2[0] - use_axis2[2]*final_axis1[0];
				final_axis3[2] = final_axis1[0]*use_axis2[1] - final_axis1[1]*use_axis2[0];
				let magnitude = Math.sqrt(final_axis3[0]*final_axis3[0] + final_axis3[1]*final_axis3[1] + final_axis3[2]*final_axis3[2]);
				if (0.0 < magnitude)
				{
					let scaling = (baseSize[2] + use_scale*scaleFactors[2]) / magnitude;
					if ((repeat_mode =="AXES_2D") && (k > 0))
					{
						scaling *= -1.0;
					}
					final_axis3[0] *= scaling;
					final_axis3[1] *= scaling;
					final_axis3[2] *= scaling;
				}
				
				final_axis2[0] = final_axis3[1]*final_axis1[2] - final_axis1[1]*final_axis3[2];
				final_axis2[1] = final_axis3[2]*final_axis1[0] - final_axis1[2]*final_axis3[0];
				final_axis2[2] = final_axis3[0]*final_axis1[1] - final_axis3[1]*final_axis1[0];
				magnitude = Math.sqrt(final_axis2[0]*final_axis2[0] + final_axis2[1]*final_axis2[1] + final_axis2[2]*final_axis2[2]);
				if (0.0 < magnitude)
				{
					var scaling = (baseSize[1] + use_scale*scaleFactors[1]) / magnitude;
					final_axis2[0] *= scaling;
					final_axis2[1] *= scaling;
					final_axis2[2] *= scaling;
				}
				return_arrays.push([final_point, final_axis1, final_axis2, final_axis3])
			}
		}
		return return_arrays;
	};
	
	/**
	 * Update transformation for each of the glyph in this glyphset.
	 */
	const updateGlyphsetTransformation = (
        current_positions,
        current_axis1s,
        current_axis2s,
        current_axis3s,
        current_scales
    ) => {
		let numberOfGlyphs = 1;
		if (repeat_mode == "AXES_2D" || repeat_mode == "MIRROR")
			numberOfGlyphs =  2;
		else if (repeat_mode == "AXES_3D")
			numberOfGlyphs = 3;
		const numberOfPositions = current_positions.length / 3;
		let current_glyph_index = 0;
		for (let i = 0; i < numberOfPositions; i++) {
			const current_index = i * 3;
			const current_position = [current_positions[current_index], current_positions[current_index+1],
			                current_positions[current_index+2]];
			const current_axis1 = [current_axis1s[current_index], current_axis1s[current_index+1],
			             current_axis1s[current_index+2]];
			const current_axis2 = [current_axis2s[current_index], current_axis2s[current_index+1],
			             current_axis2s[current_index+2]];
			const current_axis3 = [current_axis3s[current_index], current_axis3s[current_index+1],
			             current_axis3s[current_index+2]];
			const current_scale = [current_scales[current_index], current_scales[current_index+1],
			              current_scales[current_index+2]];
			const arrays = resolve_glyph_axes(current_position, current_axis1, current_axis2,
					current_axis3, current_scale);
			if (arrays.length == numberOfGlyphs)
			{
				for (let j = 0; j < numberOfGlyphs; j++)
				{
					const glyph = glyphList[current_glyph_index];
					if(glyph)
						glyph.setTransformation(arrays[j][0], arrays[j][1], arrays[j][2], arrays[j][3]);
					current_glyph_index++;
				}
			}
		}
	};
	
	/**
	 * Update colour for each of the glyph in this glyphset.
	 */
	const updateGlyphsetHexColors = current_colors => {
		let numberOfGlyphs = 1;
		if (repeat_mode == "AXES_2D" || repeat_mode == "MIRROR")
			numberOfGlyphs =  2;
		else if (repeat_mode == "AXES_3D")
			numberOfGlyphs = 3;
		const numberOfColours = current_colors.length;
		let current_glyph_index = 0;
		for (let i = 0; i < numberOfColours; i++) {
			const hex_values = current_colors[i];
			for (let j = 0; j < numberOfGlyphs; j++)
			{
				const glyph = glyphList[current_glyph_index];
				if (glyph) {
					const mycolor = new THREE.Color(hex_values);
					glyph.setColor(mycolor);
				}
				current_glyph_index++;
			}
		}
	};
	
	/**
	 * Update the current states of the glyphs in this glyphset, this includes transformation and
	 * colour for each of them. This is called when glyphset and glyphs are initialised and whenever
	 * the internal time has been updated.
	 */
	const updateMorphGlyphsets = () => {
		let current_positions = [];
		let current_axis1s = [];
		let current_axis2s = [];
		let current_axis3s = [];
		let current_scales = [];
		let current_colors = [];
		const current_time = this.inbuildTime/this.duration * (numberOfTimeSteps - 1);
		const bottom_frame =  Math.floor(current_time);
		const proportion = 1 - (current_time - bottom_frame);
		const top_frame =  Math.ceil(current_time);
		if (morphVertices) {
			const bottom_positions = positions[bottom_frame.toString()];
			const top_positions = positions[top_frame.toString()];
			const bottom_axis1 = axis1s[bottom_frame.toString()];
			const top_axis1 = axis1s[top_frame.toString()];
			const bottom_axis2 = axis2s[bottom_frame.toString()];
			const top_axis2 = axis2s[top_frame.toString()];
			const bottom_axis3 = axis3s[bottom_frame.toString()];
			const top_axis3 = axis3s[top_frame.toString()];
			const bottom_scale = scales[bottom_frame.toString()];
			const top_scale = scales[top_frame.toString()];
			
			for (let i = 0; i < bottom_positions.length; i++) {
				current_positions.push(proportion * bottom_positions[i] + (1.0 - proportion) * top_positions[i]);
				current_axis1s.push(proportion * bottom_axis1[i] + (1.0 - proportion) * top_axis1[i]);
				current_axis2s.push(proportion * bottom_axis2[i] + (1.0 - proportion) * top_axis2[i]);
				current_axis3s.push(proportion * bottom_axis3[i] + (1.0 - proportion) * top_axis3[i]);
				current_scales.push(proportion * bottom_scale[i] + (1.0 - proportion) * top_scale[i]);
			}
		} else {
			current_positions = positions["0"];
			current_axis1s = axis1s["0"];
			current_axis2s = axis2s["0"];
			current_axis3s = axis3s["0"];
			current_scales = scales["0"];
		}
		updateGlyphsetTransformation(current_positions, current_axis1s, current_axis2s, current_axis3s,
				current_scales);
		
		if (colors != undefined) {
			if (morphColours) {
				const bottom_colors = colors[bottom_frame.toString()];
				const top_colors = colors[top_frame.toString()];
				for (let i = 0; i < bottom_colors.length; i++) {
					const bot = new THREE.Color(bottom_colors[i]);
					const top = new THREE.Color(top_colors[i]);
					const resulting_color = new THREE.Color(bot.r * proportion + top.r * (1 - proportion),
					                       bot.g * proportion + top.g * (1 - proportion),
					                       bot.b * proportion + top.b * (1 - proportion));
					current_colors.push(resulting_color.getHex());
				}				
				
				/*
				for (var i = 0; i < bottom_colors.length; i++) {
					current_colors.push(proportion * bottom_colors[i] + (1.0 - proportion) * top_colors[i]);
				}
				*/
			} else {
				current_colors = colors["0"];
			}
			updateGlyphsetHexColors(current_colors);
		}
		current_positions = null;
		current_axis1s = null;
		current_axis2s = null;
		current_axis3s = null;
		current_scales = null;
		current_colors = null;
	};
	
	this.showLabel = () => {
		for ( let i = 0; i < glyphList.length; i ++ )
			glyphList[i].showLabel();
	}

	this.getColourHex = () => {
		if (!this.morphColour) {
			if (glyphList.length > 0)
				return glyphList[0].getColourHex();
		}
		return undefined;
	}

	this.setColourHex = hex => {
		for (let i = 0; i < glyphList.length; i++) {
			glyphList[i].setColourHex(hex);
		}
	}
	
	const createGlyphs = (geometry, material) => {
		for (let i = 0; i < numberOfVertices; i ++) {
			const glyph = new (require('./glyph').Glyph)(geometry, material, i + 1, this);
			if (labels != undefined && labels[i] != undefined) {
			  glyph.setLabel(labels[i]);
			}
			if (numberOfTimeSteps > 0) {
				glyph.setFrustumCulled(false);
			}
			glyphList[i] = glyph;
			group.add(glyph.getGroup());
		}
		//Update the transformation of the glyphs.
		updateGlyphsetTransformation(positions["0"], axis1s["0"],
				axis2s["0"], axis3s["0"], scales["0"]);
		//Update the color of the glyphs.
		if (colors != undefined) {
			updateGlyphsetHexColors(colors["0"]);
		}
		this.ready = true;
	};
	
	this.addCustomGlyph = glyph => {
		if (glyph.isGlyph)
			glyphList.push(glyph);
		this.ready = true;
	}
	
	this.addMeshAsGlyph = (mesh, id) => {
		if (mesh.isMesh) {
			const glyph = new (require('./glyph').Glyph)(undefined, undefined, id, this);
			glyph.fromMesh(mesh);
			glyphList.push(glyph);
			group.add(glyph.getGroup())
			this.ready = true;
			return glyph;
		}
		return undefined;
	}
	
	/**
	 * A function which iterates through the list of glyphs and call the callback
	 * function with the glyph as the argument.
	 * @param {Function} callbackFunction - Callback function with the glyph
	 * as an argument.
	 */
	this.forEachGlyph = callbackFunction => {
		for ( let i = 0; i < glyphList.length; i ++ ) {
			callbackFunction(glyphList[i]);
		}
	}
	
	var meshloader = finishCallback => {
	    return (geometry, materials) => {
			let bufferGeometry = new THREE.BufferGeometry().fromGeometry(geometry);
	    	let material = undefined;
	    	if (materials && materials[0]) {
	    		material = materials[0];
	    	}
			createGlyphs(bufferGeometry, material);
	    	if (finishCallback != undefined && (typeof finishCallback == 'function'))
        		finishCallback(this);
	    };
	}
	
	/**
	 * Get the bounding box for the whole set of glyphs.
	 * 
	 * @return {Three.Box3};
	 */
	this.getBoundingBox = () => {
		let boundingBox1 = undefined, boundingBox2 = undefined;
		if (group.visible) {
			for ( let i = 0; i < glyphList.length; i ++ ) {
				boundingBox2 = glyphList[i].getBoundingBox();
				if (boundingBox1 == undefined) {
					boundingBox1 = boundingBox2;
				} else {
					boundingBox1.union(boundingBox2);
				}
			}
		}
		return boundingBox1;
	}
	
	/**
	 * Set the local time of this glyphset.
	 * 
	 * @param {Number} time - Can be any value between 0 to duration.
	 */
	this.setMorphTime = time => {
		if (time > this.duration)
			this.inbuildTime = this.duration;
		else if (0 > time)
			this.inbuildTime = 0;
		else
			this.inbuildTime = time;
		if (morphColours || morphVertices) {
			updateMorphGlyphsets();
		}
	}

  /**
   * Check if the glyphset is time varying.
   * 
   * @return {Boolean}
   */
  this.isTimeVarying = () => {
    if ((numberOfTimeSteps > 0) && (morphColours || morphVertices))
      return true;
    return false;
  }
  
	this.getCurrentTime = () => {
		return this.inbuildTime;
	}
	
	
	/**
	 * Clear this glyphset and its list of glyphs which will release them from the memory.
	 */
	this.dispose = () => {
		for( let i = glyphList.length - 1; i >= 0; i--) {
			glyphList[i].dispose();
		}
		axis1s = undefined;
		axis2s = undefined;
		axis3s = undefined;
		positions = undefined;
		scales = undefined;
		colors = undefined;
		this.ready = false;
		this.groupName = undefined;
	}
	
	//Update the geometry and colours depending on the morph.
	this.render = (delta, playAnimation) => {
		if (playAnimation == true) 
		{
			let targetTime = this.inbuildTime + delta;
			if (targetTime > this.duration)
				targetTime = targetTime - this.duration
			this.inbuildTime = targetTime;
			if (morphColours || morphVertices) {
				updateMorphGlyphsets();
			}
		}
	}
}

Glyphset.prototype = Object.create((require('./zincObject').ZincObject).prototype);
exports.Glyphset = Glyphset;
