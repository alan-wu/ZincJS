var Zinc = { REVISION: '26' };

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

Zinc.Glyphset = function()  {
	var glyphList = [];
	var axis1s = undefined;
	var axis2s = undefined;
	var axis3s = undefined;
	var positions = undefined;
	var scales = undefined;
	var colors = undefined;
	var numberOfTimeSteps = 0;
	var numberOfVertices = 0;
	var baseSize = [0, 0, 0];
	var offset = [0, 0, 0];
	var scaleFactors = [ 0, 0, 0 ];
	var repeat_mode = "NONE";
	this.duration = 3000;
	var inbuildTime = 0;
	this.ready = false;
	var group = new THREE.Group();
	var _this = this;
	var morphColours = false;
	var morphVertices = false;
	var groupName = undefined;
	
	this.getGroup = function() {
		return group;
	}
	
	this.setVisibility = function(flag) {
		group.visible = flag;
	}
	
	this.load = function(glyphsetData, glyphURL, finishCallback) {
		axis1s = glyphsetData.axis1;
		axis2s = glyphsetData.axis2;
		axis3s = glyphsetData.axis3;
		positions = glyphsetData.positions;
		scales = glyphsetData.scale;
		colors = glyphsetData.colors;
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
		var loader = new THREE.JSONLoader( true );
		loader.load( glyphURL, meshloader(finishCallback));
	}
		
	var resolve_glyph_axes = function(point, axis1, axis2, axis3, scale)
	{
		var return_arrays = [];
		if (repeat_mode == "NONE" || repeat_mode == "MIRROR")
		{
			var axis_scale = [0.0, 0.0, 0.0];
			var final_axis1 = [0.0, 0.0, 0.0];
			var final_axis2 = [0.0, 0.0, 0.0];
			var final_axis3 = [0.0, 0.0, 0.0];
			var final_point = [0.0, 0.0, 0.0];
			var mirrored_axis1 = [0.0, 0.0, 0.0];
			var mirrored_axis2 = [0.0, 0.0, 0.0];
			var mirrored_axis3 = [0.0, 0.0, 0.0];
			var mirrored_point = [0.0, 0.0, 0.0];
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
			var axis_scale = [0.0, 0.0, 0.0];
			var final_point = [0.0, 0.0, 0.0];
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
			var number_of_glyphs = (glyph_repeat_mode == "AXES_2D") ? 2 : 3;
			for (var k = 0; k < number_of_glyphs; k++)
			{
				var use_axis1, use_axis2;
				var use_scale = scale[k];
				var final_axis1 = [0.0, 0.0, 0.0];
				var final_axis2 = [0.0, 0.0, 0.0];
				var final_axis3 = [0.0, 0.0, 0.0];
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
				var final_scale1 = baseSize[0] + use_scale*scaleFactors[0];
				final_axis1[0] = use_axis1[0]*final_scale1;
				final_axis1[1] = use_axis1[1]*final_scale1;
				final_axis1[2] = use_axis1[2]*final_scale1;
				final_axis3[0] = final_axis1[1]*use_axis2[2] - use_axis2[1]*final_axis1[2];
				final_axis3[1] = final_axis1[2]*use_axis2[0] - use_axis2[2]*final_axis1[0];
				final_axis3[2] = final_axis1[0]*use_axis2[1] - final_axis1[1]*use_axis2[0];
				var magnitude = Math.sqrt(final_axis3[0]*final_axis3[0] + final_axis3[1]*final_axis3[1] + final_axis3[2]*final_axis3[2]);
				if (0.0 < magnitude)
				{
					var scaling = (baseSize[2] + use_scale*scaleFactors[2]) / magnitude;
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
	}
	
	var updateGlyphsetTransformation = function(current_positions, current_axis1s, current_axis2s, current_axis3s,
			current_scales) {
		var numberOfGlyphs = 1;
		if (repeat_mode == "AXES_2D" || repeat_mode == "MIRROR")
			numberOfGlyphs =  2;
		else if (repeat_mode == "AXES_3D")
			numberOfGlyphs = 3;
		var numberOfPositions = current_positions.length / 3;
		var current_glyph_index = 0 ;
		for (var i = 0; i < numberOfPositions; i++) {
			var current_index = i * 3;
			var current_position = [current_positions[current_index], current_positions[current_index+1],
			                current_positions[current_index+2]];
			var current_axis1 = [current_axis1s[current_index], current_axis1s[current_index+1],
			             current_axis1s[current_index+2]];
			var current_axis2 = [current_axis2s[current_index], current_axis2s[current_index+1],
			             current_axis2s[current_index+2]];
			var current_axis3 = [current_axis3s[current_index], current_axis3s[current_index+1],
			             current_axis3s[current_index+2]];
			var current_scale = [current_scales[current_index], current_scales[current_index+1],
			              current_scales[current_index+2]];
			var arrays = resolve_glyph_axes(current_position, current_axis1, current_axis2,
					current_axis3, current_scale);
			if (arrays.length == numberOfGlyphs)
			{
				for (var j = 0; j < numberOfGlyphs; j++)
				{
					var glyph = glyphList[current_glyph_index];
					glyph.setTransformation(arrays[j][0], arrays[j][1], arrays[j][2], arrays[j][3]);
					current_glyph_index++;
				}
			}
		}
	}
	
	var updateGlyphsetHexColors = function(current_colors) {
		var numberOfGlyphs = 1;
		if (repeat_mode == "AXES_2D" || repeat_mode == "MIRROR")
			numberOfGlyphs =  2;
		else if (repeat_mode == "AXES_3D")
			numberOfGlyphs = 3;
		var numberOfColours = current_colors.length;
		var current_glyph_index = 0 ;
		for (var i = 0; i < numberOfColours; i++) {
			var hex_values = current_colors[i];

			for (var j = 0; j < numberOfGlyphs; j++)
			{
				var glyph = glyphList[current_glyph_index];
				var mycolor = new THREE.Color(hex_values);
				glyph.setColor(mycolor);
				current_glyph_index++;
			}
		}
	}
	
	var updateMorphGlyphsets = function() {
		var current_positions = [];
		var current_axis1s = [];
		var current_axis2s = [];
		var current_axis3s = [];
		var current_scales = [];
		var current_colors = [];
		var current_time = inbuildTime/_this.duration * (numberOfTimeSteps - 1);
		var bottom_frame =  Math.floor(current_time);
		var proportion = 1 - (current_time - bottom_frame);
		var top_frame =  Math.ceil(current_time);
		if (morphVertices) {
			var bottom_positions = positions[bottom_frame.toString()];
			var top_positions = positions[top_frame.toString()];
			var bottom_axis1 = axis1s[bottom_frame.toString()];
			var top_axis1 = axis1s[top_frame.toString()];
			var bottom_axis2 = axis2s[bottom_frame.toString()];
			var top_axis2 = axis2s[top_frame.toString()];
			var bottom_axis3 = axis3s[bottom_frame.toString()];
			var top_axis3 = axis3s[top_frame.toString()];
			var bottom_scale = scales[bottom_frame.toString()];
			var top_scale = scales[top_frame.toString()];
			
			for (var i = 0; i < bottom_positions.length; i++) {
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
				var bottom_colors = colors[bottom_frame.toString()];
				var top_colors = colors[top_frame.toString()];
				for (var i = 0; i < bottom_colors.length; i++) {
					var bot = new THREE.Color(bottom_colors[i]);
					var top = new THREE.Color(top_colors[i]);
					var resulting_color = new THREE.Color(bot.r * proportion + top.r * (1 - proportion),
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
	}
	
	var createGlyphs = function(geometry, material) {
		for (var i = 0; i < numberOfVertices; i ++) {
			var glyph = new Zinc.Glyph(geometry, material, i + 1);
			glyphList[i] = glyph;
			group.add(glyph.getMesh());
		}
		
		updateGlyphsetTransformation(positions["0"], axis1s["0"],
				axis2s["0"], axis3s["0"], scales["0"]);
		if (colors != undefined) {
			updateGlyphsetHexColors(colors["0"]);
		}
		_this.ready = true;
	}
	
	this.forEachGlyph = function(callbackFunction) {
		for ( var i = 0; i < glyphList.length; i ++ ) {
			callbackFunction(glyphList[i]);
		}
	}
	
	var meshloader = function(finishCallback) {
	    return function(geometry, materials){
	    	var material = undefined;
	    	if (materials && materials[0]) {
	    		material = materials[0];
	    	}
	    	createGlyphs(geometry, material);
	    	if (finishCallback != undefined && (typeof finishCallback == 'function'))
        		finishCallback(_this);
	    }
	}
	
	this.getBoundingBox = function() {
		var boundingBox1 = undefined, boundingBox2 = undefined;
		for ( var i = 0; i < glyphList.length; i ++ ) {
			boundingBox2 = glyphList[i].getBoundingBox();
			if (boundingBox1 == undefined) {
				boundingBox1 = boundingBox2;
			} else {
				boundingBox1.union(boundingBox2);
			}
		}
		return boundingBox1;
	}
	
	this.setMorphTime = function (time) {
		if (time > _this.duration)
			inbuildTime = _this.duration;
		else if (0 > time)
			inbuildTime = 0;
		else
			inbuildTime = time;
		if (morphColours || morphVertices) {
			updateMorphGlyphsets();
		}
	}
	
	this.render = function(delta, playAnimation) {
		if (playAnimation == true) 
		{
			var targetTime = inbuildTime + delta;
			if (targetTime > _this.duration)
				targetTime = targetTime - _this.duration
			inbuildTime = targetTime;
			if (morphColours || morphVertices) {
				updateMorphGlyphsets();
			}
		}
	}
}

Zinc.Geometry = function () {
	this.geometry = undefined;
	this.mixer = undefined;
	this.timeEnabled = false;
	this.morphColour = false;
	this.modelId = -1;
	this.morph = undefined;
	this.clipAction = undefined;
	this.duration = 3000;
	this.groupName = undefined;
	var inbuildTime = 0;
	var _this = this;
	
	this.setVisibility = function(visible) {
		_this.morph.visible = visible
	}
	
	this.setAlpha = function(alpha){
		var material = _this.morph.material
		var isTransparent = false
		if (alpha  < 1.0)
			isTransparent = true
		material.transparent = isTransparent
		material.opacity = alpha
	}
	
	this.getCurrentTime = function () {
		if (_this.clipAction) {
			var ratio = _this.clipAction.time / _this.clipAction._clip.duration;
			return _this.duration * ratio;
		} else {
			return inbuildTime;
		}
	}
	
	this.setMorphTime = function(time){
		if (_this.clipAction) {
			var ratio = time / _this.duration;
			var actualDuration = _this.clipAction._clip.duration;
			_this.clipAction.time = ratio * actualDuration;
			if (_this.clipAction.time > actualDuration)
				_this.clipAction.time = actualDuration;
			if (_this.clipAction.time < 0.0)
				_this.clipAction.time = 0.0;
			if (_this.timeEnabled == 1)
				_this.mixer.update( 0.0 );
		} else {
			if (time > _this.duration)
				inbuildTime = _this.duration;
			else if (0 > time)
				inbuildTime = 0;
			else
				inbuildTime = time;
		}
		if (_this.morphColour == 1) {
			if (typeof _this.geometry !== "undefined") {
				if (_this.morph.material.vertexColors == THREE.VertexColors)
				{
					morphColorsToVertexColors(_this.geometry, _this.morph, _this.clipAction)
				}
				_this.geometry.colorsNeedUpdate = true;
			}
		}
	}
	
	this.calculateUVs = function() {
		_this.geometry.computeBoundingBox();
		var max = _this.geometry.boundingBox.max,
		    min = _this.geometry.boundingBox.min;
		var offset = new THREE.Vector2(0 - min.x, 0 - min.y);
		var range = new THREE.Vector2(max.x - min.x, max.y - min.y);
		_this.geometry.faceVertexUvs[0] = [];
		for (var i = 0; i < _this.geometry.faces.length ; i++) {
		    var v1 = _this.geometry.vertices[_this.geometry.faces[i].a];
		    var v2 = _this.geometry.vertices[_this.geometry.faces[i].b];
		    var v3 = _this.geometry.vertices[_this.geometry.faces[i].c];
		    geometry.faceVertexUvs[0].push(
		        [
		            new THREE.Vector2((v1.x + offset.x)/range.x ,(v1.y + offset.y)/range.y),
		            new THREE.Vector2((v2.x + offset.x)/range.x ,(v2.y + offset.y)/range.y),
		            new THREE.Vector2((v3.x + offset.x)/range.x ,(v3.y + offset.y)/range.y)
		        ]);
		}
		geometry.uvsNeedUpdate = true;	
	}
	
	this.setWireframe = function(wireframe) {
		_this.morph.material.wireframe = wireframe
	}
	
	this.setVertexColors = function(vertexColors) {
		_this.morph.material.vertexColors = vertexColors
		_this.geometry.colorsNeedUpdate = true;
	}
	
	this.setColour= function(colour) {
		_this.morph.material.color = colour
		_this.geometry.colorsNeedUpdate = true;
	}
	
	this.setMaterial=function(material) {
		_this.morph.material = material;
		_this.geometry.colorsNeedUpdate = true;
	}
	
	getColorsRGB = function(colors, index)
	{
		var index_in_colors = Math.floor(index/3);
		var remainder = index%3;
		var hex_value = 0;
		if (remainder == 0)
		{
			hex_value = colors[index_in_colors].r
		}
		else if (remainder == 1)
		{
			hex_value = colors[index_in_colors].g
		}
		else if (remainder == 2)
		{
			hex_value = colors[index_in_colors].b
		}
		var mycolor = new THREE.Color(hex_value);
		return [mycolor.r, mycolor.g, mycolor.b];
	}
	
	var morphColorsToVertexColors = function( targetGeometry, morph, clipAction ) {
		if ( morph && targetGeometry.morphColors && targetGeometry.morphColors.length) {
			var current_time = 0.0;
			if (clipAction)
				current_time = clipAction.time/clipAction._clip.duration * (targetGeometry.morphColors.length - 1);
			else
				current_time = inbuildTime/_this.duration * (targetGeometry.morphColors.length - 1);
			
			var bottom_frame =  Math.floor(current_time)
			var proportion = 1 - (current_time - bottom_frame)
			var top_frame =  Math.ceil(current_time)
			var bottomColorMap = targetGeometry.morphColors[ bottom_frame ];
			var TopColorMap = targetGeometry.morphColors[ top_frame ];
			
			for ( var i = 0; i < targetGeometry.faces.length; i ++ ) {
				var my_color1 = getColorsRGB(bottomColorMap.colors, targetGeometry.faces[i].a);
				var my_color2 = getColorsRGB(TopColorMap.colors, targetGeometry.faces[i].a);
				var resulting_color = [my_color1[0] * proportion + my_color2[0] * (1 - proportion),
					my_color1[1] * proportion + my_color2[1] * (1 - proportion),
					my_color1[2] * proportion + my_color2[2] * (1 - proportion)]
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
	
	this.getBoundingBox = function() {
		if (_this.morph) {
			return new THREE.Box3().setFromObject(_this.morph);
		}
		return undefined;
	}
	
	this.dispose = function() {
		_this.morph.geometry.dispose();
		_this.morph.material.dispose();
		_this.geometry = undefined;
		_this.mixer = undefined;
		_this.morph = undefined;
		_this.clipAction = undefined;
		_this.groupName = undefined;
		_this = undefined;		
	}
	
	this.render = function(delta, playAnimation) {
		if (playAnimation == true) 
		{
			if ((_this.clipAction) && (_this.timeEnabled == 1)) {
				_this.mixer.update( delta );
			}
			else {
				var targetTime = inbuildTime + delta;
				if (targetTime > _this.duration)
					targetTime = targetTime - _this.duration
				inbuildTime = targetTime;
			}
			if (_this.morphColour == 1) {
				if (typeof _this.geometry !== "undefined") {
					
					if (_this.morph.material.vertexColors == THREE.VertexColors)
					{
						var clipAction = undefined;
						if (_this.clipAction && (_this.timeEnabled == 1))
							clipAction = _this.clipAction;
						morphColorsToVertexColors(_this.geometry, _this.morph, clipAction);
						_this.geometry.colorsNeedUpdate = true;
					}
					
				}
			}	
		}
	}
}

Zinc.defaultMaterialColor = 0x7F1F1A;
Zinc.defaultOpacity = 1.0;

Zinc.Scene = function ( containerIn, rendererIn) {
	var container = containerIn;
	//zincGeometries contains a tuple of the threejs mesh, timeEnabled, morphColour flag, unique id and morph
	var zincGeometries = [];
	var zincGlyphsets = [];
	var scene = new THREE.Scene();
	this.directionalLight = undefined;
	this.ambient = undefined;
	this.camera = undefined;
	var duration = 3000;
	var centroid = [0, 0, 0];
	var zincCameraControls = undefined;
	var num_inputs = 0;
	var startingId = 1000;
	this.sceneName = undefined;
	this.progressMap = [];
	var errorDownload = false;
	var stereoEffectFlag = false;
	var stereoEffect = undefined;
	var _this = this;
	this.autoClearFlag = true;
	
	this.getDownloadProgress = function() {
		var totalSize = 0;
		var totalLoaded = 0;
		var unknownFound = false;
		
		for (var key in _this.progressMap) {
			var progress = _this.progressMap[key];
			
			totalSize += progress[1];
			totalLoaded += progress[0];
			
			if (progress[1] == 0)
				unknownFound = true;
		}
		if (unknownFound) {
			totalSize = 0;
		}
		return [totalSize, totalLoaded, errorDownload];
	}
	
	
	this.onProgress = function(id) {
	    return function(xhr){
	    	_this.progressMap[id] = [xhr.loaded, xhr.total];
	    }
	}

	this.onError = function ( xhr ) {
		errorDownload = true;
	};
	
	this.onWindowResize = function() {
		zincCameraControls.onResize();
		_this.camera.aspect = container.clientWidth / container.clientHeight;
		_this.camera.updateProjectionMatrix();
	}
	
	this.resetView = function()
	{
		_this.onWindowResize();
		zincCameraControls.resetView();
	}
	
	setupCamera = function() {
		_this.camera = new THREE.PerspectiveCamera( 40, container.clientWidth / container.clientHeight, 0.0, 10.0);
		_this.ambient = new THREE.AmbientLight( 0x202020 );
		scene.add( _this.ambient );
	
		_this.directionalLight = new THREE.DirectionalLight( 0x777777  );
		scene.add( _this.directionalLight );

		zincCameraControls = new ZincCameraControls( _this.camera, rendererIn.domElement, rendererIn, scene );

		zincCameraControls.setDirectionalLight(_this.directionalLight);
		zincCameraControls.resetView();
	}
	
	setupCamera();
	
	nextAvailableInternalZincModelId = function() {
		var idFound = true;
		while (idFound == true) {
			startingId++;
			idFound = false
			for ( var i = 0; i < zincGeometries.length; i ++ ) {
				if (zincGeometries[i].modelId == startingId)
				{
					idFound = true;
				}
			}
		}
		return startingId;
	}
	
	this.loadView = function(viewData)
	{
		var viewPort = new ZincViewport();
		viewPort.nearPlane = viewData.nearPlane;
		viewPort.farPlane = viewData.farPlane;
		viewPort.eyePosition = viewData.eyePosition;
		viewPort.targetPosition = viewData.targetPosition;
		viewPort.upVector = viewData.upVector;
		zincCameraControls.setDefaultCameraSettings(viewPort);
		zincCameraControls.resetView();
	}
	
	this.getBoundingBox = function() {
		var boundingBox1 = undefined, boundingBox2 = undefined;
		for ( var i = 0; i < zincGeometries.length; i ++ ) {
			boundingBox2 = zincGeometries[i].getBoundingBox();
			if (boundingBox1 == undefined) {
				boundingBox1 = boundingBox2;
			} else {
				boundingBox1.union(boundingBox2);
			}
		}
		for ( var i = 0; i < zincGlyphsets.length; i ++ ) {
			boundingBox2 = zincGlyphsets[i].getBoundingBox();
			if (boundingBox1 == undefined) {
				boundingBox1 = boundingBox2;
			} else {
				boundingBox1.union(boundingBox2);
			}
		}
		return boundingBox1;
	}
	
	this.viewAllWithBoundingBox = function(boundingBox) {
		if (boundingBox) {
			// enlarge radius to keep image within edge of window
			var radius = boundingBox.min.distanceTo(boundingBox.max)/2.0;
			var centreX = (boundingBox.min.x + boundingBox.max.x) / 2.0;
			var centreY = (boundingBox.min.y + boundingBox.max.y) / 2.0;
			var centreZ = (boundingBox.min.z + boundingBox.max.z) / 2.0;
			var clip_factor = 4.0;
			var viewport= zincCameraControls.getViewportFromCentreAndRadius(centreX, centreY, centreZ, radius, 40, radius * clip_factor );
			
			zincCameraControls.setCurrentCameraSettings(viewport);
		}
	}

	this.viewAll = function() {
		var boundingBox = _this.getBoundingBox();
		_this.viewAllWithBoundingBox(boundingBox);
	}
	
	this.forEachGeometry = function(callbackFunction) {
		for ( var i = 0; i < zincGeometries.length; i ++ ) {
			callbackFunction(zincGeometries[i]);
		}
	}
	
	this.forEachGlyphset = function(callbackFunction) {
		for ( var i = 0; i < zincGlyphsets.length; i ++ ) {
			callbackFunction(zincGlyphsets[i]);
		}
	}
	
	this.findGeometriesWithGroupName = function(GroupName) {
		var geometriesArray = [];
		for ( var i = 0; i < zincGeometries.length; i ++ ) {
			if (zincGeometries[i].groupName == GroupName) {
				geometriesArray.push(zincGeometries[i]);
			}
		}
		return geometriesArray;
	}
	
	this.findGlyphsetsWithGroupName = function(GroupName) {
		var glyphsetsArray = [];
		for ( var i = 0; i < zincGlyphsets.length; i ++ ) {
			if (zincGlyphsets[i].groupName == GroupName) {
				glyphsetsArray.push(zincGlyphsets[i]);
			}
		}
		return glyphsetsArray;
	}
	
	var loadGlyphset = function(glyphsetData, glyphurl, groupName, finishCallback)
	{
		var newGlyphset = new Zinc.Glyphset();
        newGlyphset.duration = 3000;
        newGlyphset.load(glyphsetData, glyphurl, finishCallback);
        newGlyphset.groupName = groupName;
        var group = newGlyphset.getGroup();
        scene.add( group );
        zincGlyphsets.push ( newGlyphset ) ;
	}
	
	var onLoadGlyphsetReady = function(xmlhttp, glyphurl, groupName, finishCallback) {
		return function() {
			if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
				var glyphsetData = JSON.parse(xmlhttp.responseText);
	        	loadGlyphset(glyphsetData, glyphurl, groupName, finishCallback);
			}
		}
	}
	
	this.loadGlyphsetURL = function(metaurl, glyphurl, groupName, finishCallback)
	{
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = onLoadGlyphsetReady(xmlhttp, glyphurl, groupName, finishCallback);
		xmlhttp.open("GET", metaurl, true);
		xmlhttp.send();
	}
		
	var loadMetaModel = function(url, timeEnabled, morphColour, groupName, fileFormat, finishCallback)
	{
		num_inputs += 1;
        var modelId = nextAvailableInternalZincModelId();

        var colour = Zinc.defaultMaterialColor;
        var opacity = Zinc.defaultOpacity;
        var localTimeEnabled = 0;
        if (timeEnabled != undefined)
        	localTimeEnabled = timeEnabled ? true: false;
        var localMorphColour = 0;
        if (morphColour != undefined)
        	localMorphColour = morphColour ? true: false;
        var loader = new THREE.JSONLoader( true );
        if (fileFormat !== undefined) {
        	if (fileFormat == "STL") {
        		loader = new THREE.STLLoader( );
        	} else if (fileFormat == "OBJ") {
        		loader = new THREE.OBJLoader( );
        		loader.load( url, objloader(modelId, colour, opacity, localTimeEnabled,
        			localMorphColour, groupName, finishCallback), _this.onProgress(i), _this.onError);
        		return;
        	}
        }
        loader.load( url, meshloader(modelId, colour, opacity, localTimeEnabled,
        		localMorphColour, groupName, finishCallback), _this.onProgress(i), _this.onError); 
	}
	
	var readMetadataItem = function(item, finishCallback) {
		if (item) {
			if (item.Type == "Surfaces") {
				loadMetaModel(item.URL, item.MorphVertices, item.MorphColours, item.GroupName, item.FileFormat, finishCallback);
			} else if (item.Type == "Glyph") {
				_this.loadGlyphsetURL(item.URL, item.GlyphGeometriesURL, item.GroupName, finishCallback);
			}
		}
	}
	
	this.loadSTL = function(url, groupName, finishCallback) {
		num_inputs += 1;
        var modelId = nextAvailableInternalZincModelId();
        var colour = Zinc.defaultMaterialColor;
        var opacity = Zinc.defaultOpacity;
		var loader = new THREE.STLLoader( );
		loader.load( url, meshloader(modelId, colour, opacity, false,
        	false, groupName, finishCallback)); 
	}
	
	this.loadOBJ = function(url, groupName, finishCallback) {
		num_inputs += 1;
        var modelId = nextAvailableInternalZincModelId();
        var colour = Zinc.defaultMaterialColor;
        var opacity = Zinc.defaultOpacity;
		var loader = new THREE.OBJLoader( );
		loader.load( url, meshloader(modelId, colour, opacity, false,
        	false, groupName, finishCallback)); 
	}

	this.loadMetadataURL = function(url, finishCallback) {
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = function() {
		    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
		        var metadata = JSON.parse(xmlhttp.responseText);
		        var numberOfObjects = metadata.length;
		        for (i=0; i < numberOfObjects; i++)
		        	readMetadataItem(metadata[i], finishCallback);
		    }
		}
		requestURL = url
		xmlhttp.open("GET", url, true);
		xmlhttp.send();			
	}

	this.loadModelsURL = function(urls, colours, opacities, timeEnabled, morphColour, finishCallback)
	{
		var number = urls.length;
		num_inputs += number;
        for (var i = 0; i < number; i++)
        {
        	var modelId = nextAvailableInternalZincModelId();
        	var filename = urls[i]
        	var loader = new THREE.JSONLoader( true );
        	var colour = Zinc.defaultMaterialColor;
        	var opacity = Zinc.defaultOpacity;
        	if (colours != undefined && colours[i] != undefined)
        		colour = colours[i] ? true: false;
        	if (opacities != undefined && opacities[i] != undefined)
        		opacity = opacities[i];
        	var localTimeEnabled = 0;
        	if (timeEnabled != undefined && timeEnabled[i] != undefined)
        		localTimeEnabled = timeEnabled[i] ? true: false;
        	var localMorphColour = 0;
        	if (morphColour != undefined && morphColour[i] != undefined)
        		localMorphColour = morphColour[i] ? true: false;
        	
        	loader.load( filename, meshloader(modelId, colour, opacity, localTimeEnabled, localMorphColour, undefined, 
        			finishCallback), _this.onProgress(i), _this.onError); 
        }
	}
	
	this.loadViewURL = function(url)
	{
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = function() {
		    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
		        var viewData = JSON.parse(xmlhttp.responseText);
		        _this.loadView(viewData);
		    }
		}
		requestURL = url
		xmlhttp.open("GET", requestURL, true);
		xmlhttp.send();
	}
	
	this.loadFromViewURL = function(jsonFilePrefix, finishCallback)
	{
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = function() {
		    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
		        var viewData = JSON.parse(xmlhttp.responseText);
		        _this.loadView(viewData);
		        var urls = [];
		        var filename_prefix = jsonFilePrefix + "_";
		        for (var i = 0; i < viewData.numberOfResources; i++)
		        {
		        	var filename = filename_prefix + (i + 1) + ".json";
		        	urls.push(filename);
		        }
		        _this.loadModelsURL(urls, viewData.colour, viewData.opacity, viewData.timeEnabled, viewData.morphColour, finishCallback);
		    }
		}
		requestURL = jsonFilePrefix + "_view.json";
		xmlhttp.open("GET", requestURL, true);
		xmlhttp.send();
	}
	
	var setPositionOfObject = function(mesh)
	{
		geometry = mesh.geometry;
		geometry.computeBoundingBox();
		
		var centerX = 0.5 * ( geometry.boundingBox.min.x + geometry.boundingBox.max.x );
		var centerY = 0.5 * ( geometry.boundingBox.min.y + geometry.boundingBox.max.y );
		var centerZ = 0.5 * ( geometry.boundingBox.min.z + geometry.boundingBox.max.z );
		centroid = [ centerX, centerY, centerZ]
	}
	
	var addMeshToZincGeometry = function(mesh, modelId, localTimeEnabled, localMorphColour) {
		var newGeometry = new Zinc.Geometry();
		scene.add( mesh );
		var mixer = new THREE.AnimationMixer(mesh);
		var clipAction = undefined;
		var geometry = mesh.geometry;
		if (geometry.animations && geometry.animations[0] != undefined)
		{
			var clipAction = mixer.clipAction( geometry.animations[0] ).setDuration(duration).play();			
		}
		newGeometry.duration = 3000;
		newGeometry.geometry = geometry;
		newGeometry.timeEnabled = localTimeEnabled;
		newGeometry.morphColour = localMorphColour;
		newGeometry.modelId = modelId;
		newGeometry.morph = mesh;
		newGeometry.mixer = mixer;
		newGeometry.clipAction = clipAction;
		zincGeometries.push ( newGeometry ) ;
	
		return newGeometry;
	}
	
	var objloader = function(modelId, colour, opacity, localTimeEnabled, localMorphColour, groupName, finishCallback) {
	    return function(object){
	    	num_inputs++;
	    	object.traverse( function (child) {
	    		if ( child instanceof THREE.Mesh ) {    		
	    			var zincGeometry = addMeshToZincGeometry(child, modelId, localTimeEnabled, localMorphColour);
			    	if (zincGeometry.morph)
			    		zincGeometry.morph.name = groupName;
			    	zincGeometry.groupName = groupName;
					if (finishCallback != undefined && (typeof finishCallback == 'function'))
						finishCallback(zincGeometry);
	    		}
	    	});
		}
	}
	
	this.addZincGeometry = function(geometry, modelId, colour, opacity, localTimeEnabled, localMorphColour, external, finishCallback, materialIn) {
		if (external == undefined)
			external = true	
		if (external)
			num_inputs++;
    	isTransparent = false;
		if (1.0 > opacity)
			isTransparent = true;

		var material = undefined;
		if (materialIn) {
			material = materialIn;
			material.morphTargets = localTimeEnabled;
		} else {
			if (geometry instanceof THREE.BufferGeometry && geometry.attributes.color === undefined)
				material = new THREE.MeshPhongMaterial( { color: colour, morphTargets: localTimeEnabled, morphNormals: false, transparent: isTransparent, opacity: opacity });
			else
				material = new THREE.MeshPhongMaterial( { color: colour, morphTargets: localTimeEnabled, morphNormals: false, vertexColors: THREE.VertexColors, transparent: isTransparent, opacity: opacity });
		}
		
		if (geometry instanceof THREE.Geometry ) {
			geometry.computeMorphNormals();
		}
		
		material.side = THREE.DoubleSide;
		var mesh = undefined;
		mesh = new THREE.Mesh( geometry, material );
		var newGeometry = addMeshToZincGeometry(mesh, modelId, localTimeEnabled, localMorphColour);
		
		if (finishCallback != undefined && (typeof finishCallback == 'function'))
			finishCallback(newGeometry);
		return newGeometry;
	}
	
	var meshloader = function(modelId, colour, opacity, localTimeEnabled, localMorphColour, groupName, finishCallback) {
	    return function(geometry, materials){
	    	var material = undefined;
	    	if (materials && materials[0]) {
	    		material = materials[0];
	    	}
	    	var zincGeometry = _this.addZincGeometry(geometry, modelId, colour, opacity, localTimeEnabled, localMorphColour, false, undefined, material);
	    	if (zincGeometry.morph)
	    		zincGeometry.morph.name = groupName;
	    	zincGeometry.groupName = groupName;
			if (finishCallback != undefined && (typeof finishCallback == 'function'))
				finishCallback(zincGeometry);
	    }
	}
	
	this.updateDirectionalLight = function() {
		zincCameraControls.updateDirectionalLight();
	}
	
	this.addObject = function(object) {
		scene.add(object)
	}
	
	this.getCurrentTime = function() {
		var currentTime = 0;
		if (zincGeometries[0] != undefined)
		{
			var mixer = zincGeometries[0].mixer;
			currentTime = zincGeometries[0].getCurrentTime();
		}
		return currentTime;
	}
	
	this.setMorphsTime = function(time) {
		for ( var i = 0; i < zincGeometries.length; i ++ ) {
			zincGeometry = zincGeometries[i];
			zincGeometry.setMorphTime(time);
		}
		for ( var i = 0; i < zincGlyphsets.length; i ++ ) {
			zincGlyphset = zincGlyphsets[i];
			zincGlyphset.setMorphTime(time);
		}
	}
	
	this.getZincGeometryByID = function(id) {
		for ( var i = 0; i < zincGeometries.length; i ++ ) {
			if (zincGeometries[i].modelId == id)
			{
				return zincGeometries[i];
			}
		}
		
		return null;
	}
	
	var allGlyphsetsReady = function() {
		for ( var i = 0; i < zincGlyphsets.length; i ++ ) {
			zincGlyphset = zincGlyphsets[i];
			if (zincGlyphset.ready == false)
				return false;
		}
		return true;
		
	}
	
	this.renderGeometries = function(playRate, delta, playAnimation) {
		zincCameraControls.update(delta);
		/* the following check make sure all models are loaded and synchonised */
		if (zincGeometries.length == num_inputs && allGlyphsetsReady()) {		
			for ( var i = 0; i < zincGeometries.length; i ++ ) {
				/* check if morphColour flag is set */
				zincGeometries[i].render(playRate * delta, playAnimation);
			}
			for ( var i = 0; i < zincGlyphsets.length; i ++ ) {
				zincGlyphsets[i].render(playRate * delta, playAnimation);
			}
		}
	}
	
	this.getThreeJSScene = function() {
		return scene;
	}
	
	this.setAdditionalScenesGroup = function(scenesGroup) {
		scene.add(scenesGroup);
	}
	
	this.render = function(renderer) {
		if (_this.autoClearFlag)
			renderer.clear();
		if (stereoEffectFlag && stereoEffect) {
			stereoEffect.render(scene, _this.camera);
		}
		else
			renderer.render( scene, _this.camera );
	}
	
	this.setInteractiveControlEnable = function(flag) {
		if (flag == true)
			zincCameraControls.enable();
		else
			zincCameraControls.disable();
	}
	
	this.getZincCameraControls = function () {
		return zincCameraControls;
	}
	
	this.getThreeJSScene = function() {
		return scene;
	}
	
	this.setDuration = function(durationIn) {
		duration = durationIn;
	}
	
	this.getDuration = function() {
		return duration;
	}
	
	this.setStereoEffectEnable = function(stereoFlag) {
		if (stereoFlag == true) {
			if (!stereoEffect) {
				stereoEffect = new THREE.StereoEffect( rendererIn );
			}
			stereoEffect.setSize( container.clientWidth, container.clientHeight );
		}
		else {
			rendererIn.setSize( container.clientWidth, container.clientHeight );
		}
		_this.camera.updateProjectionMatrix();
		stereoEffectFlag = stereoFlag;
	}
	
	this.isStereoEffectEnable = function() {
		return stereoEffectFlag;
	}
	
	this.removeZincGeometry = function(zincGeometry) {
		for ( var i = 0; i < zincGeometries.length; i ++ ) {
			if (zincGeometry === zincGeometries[i]) {
				scene.remove(zincGeometry.morph);
				zincGeometries.splice(i,1);
				zincGeometry.dispose();
				return;
			}
		}
	}
	
	this.removeZincGlyphset = function(zincGlyphset) {
		for ( var i = 0; i < zincGlyphsets.length; i ++ ) {
			if (zincGlyphset === zincGlyphsets[i]) {
				scene.remove(zincGlyphset.getGroup());
				zincGlyphsets.splice(i,1);
				return;
			}
		}
	}
}

Zinc.Renderer = function (containerIn, window) {

	var animation = 0;
	
	var container = containerIn;
	
	var stats = 0;
	
	var renderer = undefined;
	var currentScene = undefined;

	//myGezincGeometriestains a tuple of the threejs mesh, timeEnabled, morphColour flag, unique id and morph
	var clock = new THREE.Clock();
	this.playAnimation = true
	/* default animation update rate, rate is 500 and duration is default to 3000, 6s to finish a full animation */
	var playRate = 500;
	var preRenderCallbackFunctions = {};
	var preRenderCallbackFunctions_id = 0;
	var animated_id = undefined;
	var cameraOrtho = undefined, sceneOrtho = undefined, logoSprite = undefined;
	var sceneMap = [];
	var additionalActiveScenes = [];
	var scenesGroup = new THREE.Group();
	var _this = this;
	var currentSize = [0, 0];
	
	this.onWindowResize = function() {
		currentScene.onWindowResize();
		if (renderer != undefined) {
			renderer.setSize( container.clientWidth, container.clientHeight );
			currentSize[0] = renderer.getSize().width;
			currentSize[1] = renderer.getSize().height;
		}
	}
	
	this.initialiseVisualisation = function() {
        var onMobile = false;
        if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
                onMobile = true;
        }
        if (onMobile)
                renderer = new THREE.WebGLRenderer({ antialias: false});
        else {
                renderer = new THREE.WebGLRenderer({ antialias: true});
        }
		container.appendChild( renderer.domElement );
		renderer.setClearColor( 0xffffff, 1);
		var scene = _this.createScene("default");
		_this.setCurrentScene(scene);
	}
	
	this.getCurrentScene = function() {
		return currentScene;
	}
	
	this.setCurrentScene = function(sceneIn) {
		if (sceneIn) {
			_this.removeActiveScene(sceneIn);
			var oldScene = currentScene;
			currentScene = sceneIn;
			if (oldScene) {
				oldScene.setInteractiveControlEnable(false);
			}
			currentScene.setInteractiveControlEnable(true);
			currentScene.setAdditionalScenesGroup(scenesGroup);
			_this.onWindowResize();
		}
	}
	
	this.getSceneByName = function(name) {
		return sceneMap[name];
	}
	
	this.createScene = function (name) {
		if (sceneMap[name] != undefined){
			return undefined;
		} else {
			var new_scene = new Zinc.Scene(container, renderer)
			sceneMap[name] = new_scene;
			new_scene.sceneName = name;
			return new_scene;
		}
	}
	
	var updateOrthoScene = function() {
		if (logoSprite != undefined) {
			var material = logoSprite.material;
			if (material.map)
				logoSprite.position.set( (container.clientWidth- material.map.image.width)/2, 
					(-container.clientHeight + material.map.image.height)/2, 1 );
		}
	}
	
	var updateOrthoCamera = function() {
		if (cameraOrtho != undefined) {
			cameraOrtho.left = - container.clientWidth / 2;
			cameraOrtho.right = container.clientWidth / 2;
			cameraOrtho.top =  container.clientHeight / 2;
			cameraOrtho.bottom = -  container.clientHeight / 2;
			cameraOrtho.updateProjectionMatrix();
		}
	}
	
	this.resetView = function()	{
		currentScene.resetView();
	}
	
	this.viewAll = function()	{
		if (currentScene) {	
			var boundingBox = currentScene.getBoundingBox();
			if (boundingBox) {
			    for(i = 0; i < additionalActiveScenes.length; i++) {
			        var boundingBox2 = additionalActiveScenes[i].getBoundingBox();
			        if (boundingBox2) {
			        	boundingBox.union(boundingBox2);
			        }
			    }
				currentScene.viewAllWithBoundingBox(boundingBox);
			}
		}
	}
	
	this.loadModelsURL = function(urls, colours, opacities, timeEnabled, morphColour, finishCallback) {
		currentScene.loadModelsURL(urls, colours, opacities, timeEnabled, morphColour, finishCallback);
	}
	
	loadView = function(viewData) {
		currentScene.loadView(viewData);
	}
	
	this.loadViewURL = function(url)
	{
		currentScene.loadViewURL(url);
	}
	
	this.loadFromViewURL = function(jsonFilePrefix, finishCallback)
	{
		currentScene.loadFromViewURL(jsonFilePrefix, finishCallback);
	}	

	this.addZincGeometry = function(geometry, modelId, colour, opacity, localTimeEnabled, localMorphColour, external, finishCallback) {
		return currentScene.addZincGeometry(geometry, modelId, colour, opacity, localTimeEnabled, localMorphColour, external, finishCallback);
	}
			
	this.updateDirectionalLight = function() {
		currentScene.updateDirectionalLight();
	}
	
	/* function to make sure each vertex got the right colour at the right time,
		it will linearly interpolate colour between time steps */

	this.stopAnimate = function () {
		cancelAnimationFrame(animated_id);
   		animated_id = undefined;
	}

	this.animate = function() {
		animated_id = requestAnimationFrame( _this.animate );
		_this.render();
	}

	var prevTime = Date.now();
	
	this.addPreRenderCallbackFunction = function(callbackFunction) {
		preRenderCallbackFunctions_id = preRenderCallbackFunctions_id + 1;
	
		preRenderCallbackFunctions[preRenderCallbackFunctions_id] = callbackFunction;
		return preRenderCallbackFunctions_id;
	}
	
	this.removePreRenderCallbackFunction = function(id) {
		if (id in preRenderCallbackFunctions) {
   			delete preRenderCallbackFunctions[id];
		}
	}
	
	this.getPlayRate = function() {
		return playRate;
	}
	
	this.setPlayRate = function(playRateIn) {
		playRate = playRateIn;
	}
	
	this.getCurrentTime = function() {
		return currentScene.getCurrentTime();
	}
	
	this.setMorphsTime = function(time) {
		currentScene.setMorphsTime(time);
	}
	
	this.getZincGeometryByID = function(id) {
		return currentScene.getZincGeometryByID(id);
	}	
	this.addToScene = function(object) {
		currentScene.addObject(object)
	}
	
	this.addToOrthoScene = function(object) {
		if (sceneOrtho == undefined)
			sceneOrtho = new THREE.Scene();
		if (cameraOrtho == undefined) {
			cameraOrtho = new THREE.OrthographicCamera( - container.clientWidth / 2,
					container.clientWidth / 2, container.clientHeight / 2, - container.clientHeight / 2, 1, 10 );
			cameraOrtho.position.z = 10;
		}
		sceneOrtho.add(object)
	}
	
	var createHUDSprites = function(logoSprite) {
		return function(texture){
			texture.needsUpdate = true;
			var material = new THREE.SpriteMaterial( { map: texture } );
			var imagewidth = material.map.image.width;
			var imageheight = material.map.image.height;
			
			logoSprite.material = material;
			logoSprite.scale.set( imagewidth, imageheight, 1 );
			logoSprite.position.set( (container.clientWidth- imagewidth)/2, (-container.clientHeight + imageheight)/2, 1 );
			_this.addToOrthoScene(logoSprite)
		}
	}
	
	this.addLogo = function() {
		logoSprite = new THREE.Sprite();
		var logo = THREE.ImageUtils.loadTexture(
				"images/abi_big_logo_transparent_small.png", undefined, createHUDSprites(logoSprite))
	}
	
	this.render = function() {
		if (currentSize[0] != container.clientWidth || currentSize[1] != container.clientHeight ) {
			_this.onWindowResize();
		}
		var delta = clock.getDelta();
		currentScene.renderGeometries(playRate, delta, _this.playAnimation);
	    for(i = 0; i < additionalActiveScenes.length; i++) {
	        var sceneItem = additionalActiveScenes[i];
	        sceneItem.renderGeometries(playRate, delta, _this.playAnimation);
	    }
		if (cameraOrtho != undefined && sceneOrtho != undefined) {
			renderer.clearDepth();
			renderer.render( sceneOrtho, cameraOrtho );
		}
    	for (key in preRenderCallbackFunctions) {
        	if (preRenderCallbackFunctions.hasOwnProperty(key)) {
        		preRenderCallbackFunctions[key].call();
        	}
    	}
		currentScene.render(renderer);
	}
	
	this.getThreeJSRenderer = function () {
		return renderer;
	}
	
	this.isSceneActive = function (sceneIn) {
		if (currentScene === sceneIn) {
			return true;
		} else {
		    for(i = 0; i < additionalActiveScenes.length; i++) {
		        var sceneItem = additionalActiveScenes[i];
		        if (sceneItem === sceneIn)
		        	return true;
		    }
		}
	    return false;
	} 
	
	this.addActiveScene = function(additionalScene) {
		if (!_this.isSceneActive(additionalScene)) {
			additionalActiveScenes.push(additionalScene);
			scenesGroup.add(additionalScene.getThreeJSScene());
		}
	}
	
	this.removeActiveScene = function(additionalScene) {
	    for(i = 0; i < additionalActiveScenes.length; i++) {
	        var sceneItem = additionalActiveScenes[i];
	        if (sceneItem === additionalScene) {
	        	additionalActiveScenes.splice(i, 1);
	        	scenesGroup.remove(additionalScene.getThreeJSScene());
	        	return;
	        }
	    }
	}
	
	this.clearAllActiveScene = function() {
		for (var i = 0; i < additionalActiveScenes.length; i++) {
			scenesGroup.remove(additionalActiveScenes[i].getThreeJSScene());
		}
		additionalActiveScenes.splice(0,additionalActiveScenes.length);
	}
	
	this.transitionScene = function(endingScene, duration) {
		if (currentScene) {
			var currentCamera = currentScene.getZincCameraControls();
			var boundingBox = endingScene.getBoundingBox();
			if (boundingBox) {
				var radius = boundingBox.min.distanceTo(boundingBox.max)/2.0;
				var centreX = (boundingBox.min.x + boundingBox.max.x) / 2.0;
				var centreY = (boundingBox.min.y + boundingBox.max.y) / 2.0;
				var centreZ = (boundingBox.min.z + boundingBox.max.z) / 2.0;
				var clip_factor = 4.0;
				var endingViewport = currentCamera.getViewportFromCentreAndRadius(centreX, centreY, centreZ, radius, 40, radius * clip_factor );
				var startingViewport = currentCamera.getCurrentViewport();
				currentCamera.cameraTransition(startingViewport, endingViewport, duration);
				currentCamera.enableCameraTransition();
			}
		}
	}
};


//Convenient function
function loadExternalFile(url, data, callback, errorCallback) {
    // Set up an asynchronous request
    var request = new XMLHttpRequest();
    request.open('GET', url, true);

    // Hook the event that gets called as the request progresses
    request.onreadystatechange = function () {
        // If the request is "DONE" (completed or failed)
        if (request.readyState == 4) {
            // If we got HTTP status 200 (OK)
            if (request.status == 200) {
                callback(request.responseText, data)
            } else { // Failed
                errorCallback(url);
            }
        }
    };

    request.send(null);    
}

function loadExternalFiles(urls, callback, errorCallback) {
    var numUrls = urls.length;
    var numComplete = 0;
    var result = [];

    // Callback for a single file
    function partialCallback(text, urlIndex) {
        result[urlIndex] = text;
        numComplete++;

        // When all files have downloaded
        if (numComplete == numUrls) {
            callback(result);
        }
    }

    for (var i = 0; i < numUrls; i++) {
    	loadExternalFile(urls[i], i, partialCallback, errorCallback);
    }
}
