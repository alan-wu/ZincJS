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
					targetTime = targetTime - _this.duration;
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
