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
	let morphColours = false;
	let morphVertices = false;
  this.isGlyphset = true;
  let _transformMatrix = new THREE.Matrix4();
  const _bot_colour = new THREE.Color();
  const _top_colour = new THREE.Color();
  const _boundingBox1 = new THREE.Box3();
  const _boundingBox2 = new THREE.Box3();
  const _boundingBox3 = new THREE.Box3();
  const _points = [];
  for (let i = 0; i < 8; i++) {
    _points[i] = new THREE.Vector3();
  }

	/**
	 * Get the {@link Three.Group} containing all of the glyphs' meshes.
	 * @returns {Three.Group}
	 */
	this.getGroup = () => {
		return this.morph;
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
    this.geometry =  new THREE.BufferGeometry();
    this.morph = new THREE.InstancedMesh(this.geometry, undefined, numberOfVertices);
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
          _transformMatrix.elements[0] = arrays[j][1][0];
          _transformMatrix.elements[1] = arrays[j][1][1];
          _transformMatrix.elements[2] = arrays[j][1][2];
          _transformMatrix.elements[3] = 0.0;
          _transformMatrix.elements[4] = arrays[j][2][0];
          _transformMatrix.elements[5] = arrays[j][2][1];
          _transformMatrix.elements[6] = arrays[j][2][2];
          _transformMatrix.elements[7] = 0.0;
          _transformMatrix.elements[8] = arrays[j][3][0];
          _transformMatrix.elements[9] = arrays[j][3][1];
          _transformMatrix.elements[10] = arrays[j][3][2];
          _transformMatrix.elements[11] = 0.0;
          _transformMatrix.elements[12] = arrays[j][0][0];
          _transformMatrix.elements[13] = arrays[j][0][1];
          _transformMatrix.elements[14] = arrays[j][0][2];
          _transformMatrix.elements[15] = 1.0;
          this.morph.setMatrixAt( current_glyph_index, _transformMatrix );
          const glyph = glyphList[current_glyph_index];
          if (glyph)
            glyph.setTransformation(arrays[j][0], arrays[j][1],
              arrays[j][2], arrays[j][3]);
          current_glyph_index++;
				}
			}
    }
    this.morph.instanceMatrix.needsUpdate = true;
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
        _bot_colour.setHex( hex_values )
        this.morph.setColorAt( current_glyph_index, _bot_colour);
        const glyph = glyphList[current_glyph_index];
				if (glyph) 
					glyph.setColor(_bot_colour);
				current_glyph_index++;
			}
    }
    this.morph.instanceColor.needsUpdate = true;
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
    this.boundingBoxUpdateRequired = true;
		if (colors != undefined) {
			if (morphColours) {
				const bottom_colors = colors[bottom_frame.toString()];
				const top_colors = colors[top_frame.toString()];
				for (let i = 0; i < bottom_colors.length; i++) {
					_bot_colour.setHex(bottom_colors[i]);
          _top_colour.setHex(top_colors[i]);
          _bot_colour.setRGB(_bot_colour.r * proportion + _top_colour.r * (1 - proportion),
            _bot_colour.g * proportion + _top_colour.g * (1 - proportion),
            _bot_colour.b * proportion + _top_colour.b * (1 - proportion));
					current_colors.push(_bot_colour.getHex());
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
	
	const createGlyphs = () => {
    if (labels != undefined) {
      for (let i = 0; i < numberOfVertices; i ++) {
        const glyph = new (require('./glyph').Glyph)(undefined, undefined, i, this);
        if (labels != undefined && labels[i] != undefined) {
          glyph.setLabel(labels[i]);
        }
        if (numberOfTimeSteps > 0) {
          glyph.setFrustumCulled(false);
        }
        glyphList[i] = glyph;
        this.morph.add(glyph.getGroup());
      }
    }

		//Update the transformation of the glyphs.
		updateGlyphsetTransformation(positions["0"], axis1s["0"],
				axis2s["0"], axis3s["0"], scales["0"]);
		//Update the color of the glyphs.
		if (colors != undefined) {
			updateGlyphsetHexColors(colors["0"]);
		}
    this.ready = true;
    this.boundingBoxUpdateRequired = true;
	};
	
	this.addCustomGlyph = glyph => {
		if (glyph.isGlyph)
			glyphList.push(glyph);
    this.ready = true;
    this.boundingBoxUpdateRequired = true;
	}
	
	this.addMeshAsGlyph = (mesh, id) => {
		if (mesh.isMesh) {
			const glyph = new (require('./glyph').Glyph)(undefined, undefined, id, this);
			glyph.fromMesh(mesh);
			glyphList.push(glyph);
			this.morph.add(glyph.getGroup())
      this.ready = true;
      this.boundingBoxUpdateRequired = true;
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
      this.geometry.fromGeometry(geometry);
      this.geometry.computeBoundingSphere();
      this.geometry.computeBoundingBox();
      if (materials && materials[0])
        this.morph.material = materials[0];
      createGlyphs();
      this.morph.name = this.groupName;
      this.morph.userData = this;
      if (finishCallback != undefined && (typeof finishCallback == 'function'))
       finishCallback(this);
    };
  }

  /**
 * Get the index of the closest vertex to centroid.
 */
  this.getClosestVertexIndex = function() {
    let closestIndex = -1;
    if (this.morph &&  this.ready) {
      let center = new THREE.Vector3();
      this.getBoundingBox().getCenter(center);
      let current_positions = positions["0"];
      const numberOfPositions = current_positions.length / 3;
      let position = new THREE.Vector3();
      let distance = -1;
      let currentDistance = 0;
      for (let i = 0; i < numberOfPositions; i++) {
        const current_index = i * 3;
        position.set(current_positions[current_index], 
          current_positions[current_index+1],
          current_positions[current_index+2]);
        currentDistance = center.distanceTo(position);
        if (distance == -1) {
          distance = currentDistance;
          closestIndex = i;
        } else if (distance > currentDistance) {
          distance = currentDistance;
          closestIndex = i;
        }
      }
    }
    return closestIndex;
  }
  
  /**
   * Get the  closest vertex to centroid.
   */
  this.getClosestVertex = function() {
    
    if (this.markerVertexIndex == -1) {
      this.markerVertexIndex = this.getClosestVertexIndex();
    }
    if (this.markerVertexIndex >= 0) {
      /*
      if (glyphList && glyphList[this.markerVertexIndex]) {
        glyphList[this.markerVertexIndex].getBoundingBox().getCenter(position);
      }
      */
      if (this.morph) {
        let position = new THREE.Vector3();
        this.morph.getMatrixAt(this.markerVertexIndex, _transformMatrix);
        position.setFromMatrixPosition(_transformMatrix);
        return position;
      }
    }

    return undefined;
  }

	this.applyMatrix4ToBox = (box1, box2, matrix) => {
    _points[0].set( box1.min.x, box1.min.y, box1.min.z ).applyMatrix4( matrix ); // 000
    _points[1].set( box1.min.x, box1.min.y, box1.max.z ).applyMatrix4( matrix ); // 001
    _points[2].set( box1.min.x, box1.max.y, box1.min.z ).applyMatrix4( matrix ); // 010
    _points[3].set( box1.min.x, box1.max.y, box1.max.z ).applyMatrix4( matrix ); // 011
    _points[4].set( box1.max.x, box1.min.y, box1.min.z ).applyMatrix4( matrix ); // 100
    _points[5].set( box1.max.x, box1.min.y, box1.max.z ).applyMatrix4( matrix ); // 101
    _points[6].set( box1.max.x, box1.max.y, box1.min.z ).applyMatrix4( matrix ); // 110
    _points[7].set( box1.max.x, box1.max.y, box1.max.z ).applyMatrix4( matrix ); // 111
    box2.setFromPoints(_points);
  }

	
	/**
	 * Get the bounding box for the whole set of glyphs.
	 * 
	 * @return {Three.Box3};
	 */
	this.getBoundingBox = () => {
    if (this.morph && this.ready && this.morph.visible) {
      if (this.boundingBoxUpdateRequired) {
        _boundingBox1.setFromBufferAttribute(
          this.morph.geometry.attributes.position);
        for (let i = 0; i < numberOfVertices; i++) {
          this.morph.getMatrixAt(i, _transformMatrix);
          this.applyMatrix4ToBox(_boundingBox1, _boundingBox2, _transformMatrix);
          if (i == 0) {
            _boundingBox3.copy(_boundingBox2);
          } else {
            _boundingBox3.union(_boundingBox2);
          }
        }
        if (_boundingBox3) {
          this.cachedBoundingBox.copy(_boundingBox3);
          this.boundingBoxUpdateRequired = false;
        } else
          return undefined;
      }
      return this.cachedBoundingBox;
		}
		return undefined;
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
      if (morphVertices)
        this.markerUpdateRequired = true;
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
    if (this.geometry)
      this.geometry.dispose();
    if (this.morph)
      this.morph.material.dispose();
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
	this.render = (delta, playAnimation, options) => {
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
    this.updateMarker(playAnimation, options);
	}
}

Glyphset.prototype = Object.create((require('./zincObject').ZincObject).prototype);
exports.Glyphset = Glyphset;
