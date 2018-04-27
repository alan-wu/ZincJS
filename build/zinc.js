(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("THREE"));
	else if(typeof define === 'function' && define.amd)
		define(["THREE"], factory);
	else if(typeof exports === 'object')
		exports["Zinc"] = factory(require("THREE"));
	else
		root["Zinc"] = factory(root["THREE"]);
})(window, function(__WEBPACK_EXTERNAL_MODULE__1__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

var THREE = __webpack_require__(1);

/**
 * Provides a global namespace for the Zinc javascript library and some default parameters for it.
 * 
 * @namespace
 * @author Alan Wu
 */
var Zinc = { REVISION: '28' };

Zinc.defaultMaterialColor = 0x7F1F1A;
Zinc.defaultOpacity = 1.0;

Zinc.Geometry = __webpack_require__(2).Geometry;
Zinc.Glyph = __webpack_require__(3).Glyph;
Zinc.Glyphset = __webpack_require__(4).Glyphset;
Zinc.Renderer = __webpack_require__(5).Renderer;
Zinc.Scene = __webpack_require__(6).Scene;

Zinc.Viewport = __webpack_require__(7).Viewport;
Zinc.CameraControls = __webpack_require__(7).CameraControls;
Zinc.SmoothCameraTransition = __webpack_require__(7).SmoothCameraTransition;
Zinc.RayCaster = __webpack_require__(7).RayCaster;
Zinc.CameraAutoTumble = __webpack_require__(7).CameraAutoTumble;
Zinc.loadExternalFile = __webpack_require__(8).loadExternalFile;
Zinc.loadExternalFiles  = __webpack_require__(8).loadExternalFiles;


module.exports = Zinc;


/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE__1__;

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

var THREE = __webpack_require__(1);

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
	var inbuildTime = 0;
	var _this = this;
	
	/**
	 * Set the visibility of this Geometry.
	 * 
	 * @param {Boolean} visible - a boolean flag indicate the visibility to be set 
	 */
	this.setVisibility = function(visible) {
		_this.morph.visible = visible;
	}
	
	/**
	 * Set the opacity of this Geometry. This function will also set the isTransparent
	 * flag according to the provided alpha value.
	 * 
	 * @param {Number} alpah - Alpha value to set for this geometry, 
	 * can be any value between from 0 to 1.0.
	 */
	this.setAlpha = function(alpha){
		var material = _this.morph.material;
		var isTransparent = false;
		if (alpha  < 1.0)
			isTransparent = true;
		material.transparent = isTransparent;
		material.opacity = alpha;
	}
	
	
	/**
	 * Get the local time of this geometry, it returns a value between 
	 * 0 and the duration.
	 * 
	 * @return {Number}
	 */
	this.getCurrentTime = function () {
		if (_this.clipAction) {
			var ratio = _this.clipAction.time / _this.clipAction._clip.duration;
			return _this.duration * ratio;
		} else {
			return inbuildTime;
		}
	}
	
	/**
	 * Set the local time of this geometry.
	 * 
	 * @param {Number} time - Can be any value between 0 to duration.
	 */
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
	
	/**
	 * Set wireframe display for this geometry.
	 * 
	 * @param {Boolean} wireframe - Flag to turn on/off wireframe display.
	 */
	this.setWireframe = function(wireframe) {
		_this.morph.material.wireframe = wireframe;
	}
	
	this.setVertexColors = function(vertexColors) {
		_this.morph.material.vertexColors = vertexColors;
		_this.geometry.colorsNeedUpdate = true;
	}
	
	/**
	 * Set the colour of the geometry.
	 * 
	 * @param {THREE.Color} colour - Colour to be set for this geometry.
	 */
	this.setColour = function(colour) {
		_this.morph.material.color = colour
		_this.geometry.colorsNeedUpdate = true;
	}
	
	/**
	 * Set the material of the geometry.
	 * 
	 * @param {THREE.Material} material - Material to be set for this geometry.
	 */
	this.setMaterial = function(material) {
		_this.morph.material = material;
		_this.geometry.colorsNeedUpdate = true;
	}
	
	//Get the colours at index
	getColorsRGB = function(colors, index)
	{
		var index_in_colors = Math.floor(index/3);
		var remainder = index%3;
		var hex_value = 0;
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
		var mycolor = new THREE.Color(hex_value);
		return [mycolor.r, mycolor.g, mycolor.b];
	}
	
	//Calculate the interpolated colour at current time
	var morphColorsToVertexColors = function( targetGeometry, morph, clipAction ) {
		if ( morph && targetGeometry.morphColors && targetGeometry.morphColors.length) {
			var current_time = 0.0;
			if (clipAction)
				current_time = clipAction.time/clipAction._clip.duration * (targetGeometry.morphColors.length - 1);
			else
				current_time = inbuildTime/_this.duration * (targetGeometry.morphColors.length - 1);
			
			var bottom_frame =  Math.floor(current_time);
			var proportion = 1 - (current_time - bottom_frame);
			var top_frame =  Math.ceil(current_time);
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
	
	/**
	 * Get the bounding box of this geometry.
	 * 
	 * @return {THREE.Box3}.
	 */
	this.getBoundingBox = function() {
		if (_this.morph) {
			return new THREE.Box3().setFromObject(_this.morph);
		}
		return undefined;
	}
	
	/**
	 * Clear this geometry and free the memory.
	 */
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
	
	//Update the geometry and colours depending on the morph.
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


/***/ }),
/* 3 */
/***/ (function(module, exports) {

/**
 * Zinc representation of glyph graphic, it contains the colours, 
 * geometry and transformation of the glyph.
 * 
 * @param {THREE.Geometry} geometry - Geometry of the glyph.
 * @param {THREE.material} materialIn - Material of the glyph.
 * @param {Number} idIn - Ud of the glyph.
 * 
 * @class
 * @author Alan Wu
 * @return {Zinc.Glyph}
 */
exports.Glyph = function(geometry, materialIn, idIn)  {
	var material = materialIn.clone();
	material.vertexColors = THREE.FaceColors;
	var mesh = new THREE.Mesh( geometry, material );
	
	this.id = idIn;
	var _this = this;
	
	/**
	 * Get the mesh of this glyph.
	 * @return {THREE.Mesh}
	 */
	this.getMesh = function () {
		return mesh;
	}
	
	/**
	 * Get the bounding box of this glyph.
	 * @return {THREE.Box3}
	 */
	this.getBoundingBox = function() {
		if (mesh)
			return new THREE.Box3().setFromObject(mesh);
		return undefined;
	}
	
	/**
	 * Set the Colour of this glyph.
	 * @param {THREE.Color} colorIn - Colour to be set of this mesh.
	 */
	this.setColor = function (colorIn) {
		mesh.material.color = colorIn;
		mesh.geometry.colorsNeedUpdate = true;
	}
	
	/**
	 * Set the transformation of this glyph.
	 * @param {Array} position - Three components vectors containing position of the
	 * transformation.
	 * @param {Array} axis1 - Three components vectors containing axis1 rotation of the
	 * transformation.
	 * @param {Array} axis2 - Three components vectors containing axis2 rotation of the
	 * transformation.
	 * @param {Array} position - Three components vectors containing axis3 rotation of the
	 * transformation.
	 */
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
	
	/**
	 * Clear and free its memory.
	 */
	this.dispose = function() {
		_this.material.dispose();
		_this.mesh = undefined;
	}
}


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

var THREE = __webpack_require__(1);

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
exports.Glyphset = function()  {
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
	
	/**
	 * Get the {@link Three.Group} containing all of the glyphs' meshes.
	 * @returns {Three.Group}
	 */
	this.getGroup = function() {
		return group;
	}
	
	/**
	 * Set the visibility of this glyphset.
	 * @param {Boolean} flag - visibility to be set for this glyphset.
	 */
	this.setVisibility = function(flag) {
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
	
	/**
	 * Calculate the actual transformation value that can be applied 
	 * to the transformation matrix.
	 * @returns {Array}
	 */
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
	
	/**
	 * Update transformation for each of the glyph in this glyphset.
	 */
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
					if(glyph)
						glyph.setTransformation(arrays[j][0], arrays[j][1], arrays[j][2], arrays[j][3]);
					current_glyph_index++;
				}
			}
		}
	}
	
	/**
	 * Update colour for each of the glyph in this glyphset.
	 */
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
				if (glyph) {
					var mycolor = new THREE.Color(hex_values);
					glyph.setColor(mycolor);
				}
				current_glyph_index++;
			}
		}
	}
	
	/**
	 * Update the current states of the glyphs in this glyphset, this includes transformation and
	 * colour for each of them. This is called when glyphset and glyphs are initialised and whenever
	 * the internal time has been updated.
	 */
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
		//Update the transformation of the glyphs.
		updateGlyphsetTransformation(positions["0"], axis1s["0"],
				axis2s["0"], axis3s["0"], scales["0"]);
		//Update the color of the glyphs.
		if (colors != undefined) {
			updateGlyphsetHexColors(colors["0"]);
		}
		_this.ready = true;
	}
	
	/**
	 * A function which iterates through the list of glyphs and call the callback
	 * function with the glyph as the argument.
	 * @param {Function} callbackFunction - Callback function with the glyph
	 * as an argument.
	 */
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
	
	/**
	 * Get the bounding box for the whole set of glyphs.
	 * 
	 * @return {Three.Box3};
	 */
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
	
	/**
	 * Set the local time of this glyphset.
	 * 
	 * @param {Number} time - Can be any value between 0 to duration.
	 */
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
	
	/**
	 * Clear this glyphset and its list of glyphs which will release them from the memory.
	 */
	this.dispose = function() {
		for( var i = glyphList.length - 1; i >= 0; i--) {
			glyphList[i].dispose();
		}
		axis1s = undefined;
		axis2s = undefined;
		axis3s = undefined;
		positions = undefined;
		scales = undefined;
		colors = undefined;
		_this.ready = false;
		groupName = undefined;
	}
	
	//Update the geometry and colours depending on the morph.
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


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

var THREE = __webpack_require__(1);
/**
 * Create a Zinc 3D renderer in the container provided.
 * The primary function of a Zinc 3D renderer is to display the current
 * scene (@link Zinc.Scene} set to the renderer and each scene may contain as 
 * many geometries, glyphset and other primitives as the system can support.
 * Zinc.Renderer also allows additional scenes to be displayed.
 * 
 * @param {Object} containerIn - Container to create the renderer on.
 * @class
 * @author Alan Wu
 * @return {Zinc.Renderer}
 */
exports.Renderer = function (containerIn, window) {

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
	var currentOffset = [0, 0];
	
	/** 
	 * Call this to resize the renderer, this is normally call automatically.
	 */
	this.onWindowResize = function() {
		currentScene.onWindowResize();
		if (renderer != undefined) {
			renderer.setSize( container.clientWidth, container.clientHeight );
			currentSize[0] = renderer.getSize().width;
			currentSize[1] = renderer.getSize().height;
			var rect = container.getBoundingClientRect();
			currentOffset[0] = rect.left;
			currentOffset[1] = rect.top;
		}
	}
	
	/**
	 * Initialise the renderer and its visualisations.
	 */
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
	
	/**
	 * Get the current scene on display.
	 * @return {Zinc.Scene};
	 */
	this.getCurrentScene = function() {
		return currentScene;
	}
	
	/**
	 * Set the current scene on display.
	 * 
	 * @param {Zinc.Scene} sceneIn - The scene to be set, only scene created by this instance
	 * of ZincRenderer is supported currently.
	 */
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
	
	/**
	 * Return scene with the matching name if scene with that name has been created.
	 * 
	 * @param {String} name - Name to match
	 * @return {Zinc.Scene}
	 */
	this.getSceneByName = function(name) {
		return sceneMap[name];
	}
	
	/**
	 * Create a new scene with the provided name if scene with the same name exists,
	 * return undefined.
	 * 
	 * @param {String} name - Name of the scene to be created.
	 * @return {Zinc.Scene}
	 */
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
	
	/**
	 * Reset the viewport of the current scene to its original state.
	 */
	this.resetView = function()	{
		currentScene.resetView();
	}
	
	/**
	 * Adjust zoom distance to include all primitives in scene and also the additional scenes
	 * but the lookat direction and up vectors will remain constant.
	 */
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
	
	/**
	 * Load a legacy model(s) format with the provided URLs and parameters. This only loads the geometry
	 * without any of the metadata. Therefore, extra parameters should be provided. This should be
	 * called from {@link Zinc.Scene}.
	 * 
	 * @deprecated
	 */
	this.loadModelsURL = function(urls, colours, opacities, timeEnabled, morphColour, finishCallback) {
		currentScene.loadModelsURL(urls, colours, opacities, timeEnabled, morphColour, finishCallback);
	}
	
	var loadView = function(viewData) {
		currentScene.loadView(viewData);
	}
	
	/**
	 * Load the viewport from an external location provided by the url. This should be
	 * called from {@link Zinc.Scene};
	 * @param {String} URL - address to the file containing viewport information.
	 * @deprecated
	 */
	this.loadViewURL = function(url)
	{
		currentScene.loadViewURL(url);
	}
	
	/**
	 * Load a legacy file format containing the viewport and its model file from an external 
	 * location provided by the url. Use the new metadata format with
	 * {@link Zinc.Scene#loadMetadataURL} instead. This should be
	 * called from {@link Zinc.Scene};
	 * 
	 * @param {String} URL - address to the file containing viewport and model information.
	 * @deprecated
	 */
	this.loadFromViewURL = function(jsonFilePrefix, finishCallback)
	{
		currentScene.loadFromViewURL(jsonFilePrefix, finishCallback);
	}

	/**
	 * Manually add a zinc geometry to the scene. This should be
	 * called from {@link Zinc.Scene};
	 * 
	 * @deprecated
	 */
	this.addZincGeometry = function(geometry, modelId, colour, opacity, localTimeEnabled, localMorphColour, external, finishCallback) {
		return currentScene.addZincGeometry(geometry, modelId, colour, opacity, localTimeEnabled, localMorphColour, external, finishCallback);
	}
			
	this.updateDirectionalLight = function() {
		currentScene.updateDirectionalLight();
	}
	
	/**
	 * Stop the animation and renderer to get into the render loop.
	 */
	this.stopAnimate = function () {
		cancelAnimationFrame(animated_id);
   		animated_id = undefined;
	}

	/**
	 * Start the animation and begin the rendering loop.
	 */
	this.animate = function() {
		animated_id = requestAnimationFrame( _this.animate );
		_this.render();
	}

	var prevTime = Date.now();
	
	/**
	 * Add a callback function which will be called everytime before the renderer renders its scene.
	 * @param {Function} callbackFunction - callbackFunction to be added.
	 * 
	 * @return {Number}
	 */
	this.addPreRenderCallbackFunction = function(callbackFunction) {
		preRenderCallbackFunctions_id = preRenderCallbackFunctions_id + 1;
		preRenderCallbackFunctions[preRenderCallbackFunctions_id] = callbackFunction;
		return preRenderCallbackFunctions_id;
	}
	
	/**
	 * Remove a callback function that is previously added to the scene.
	 * @param {Number} id - identifier of the previously added callback function.
	 */
	this.removePreRenderCallbackFunction = function(id) {
		if (id in preRenderCallbackFunctions) {
   			delete preRenderCallbackFunctions[id];
		}
	}
	
	/**
	 * Get the current play rate, playrate affects how fast an animated object animates.
	 * Also see {@link Zinc.Scene#duration}.
	 */
	this.getPlayRate = function() {
		return playRate;
	}
	
	/**
	 * Set the current play rate, playrate affects how fast an animated object animates.
	 * @param {Number} PlayRateIn - value to set the playrate to.
	 * Also see {@link Zinc.Scene#duration}.
	 */
	this.setPlayRate = function(playRateIn) {
		playRate = playRateIn;
	}
	
	this.getCurrentTime = function() {
		return currentScene.getCurrentTime();
	}
	
	
	/**
	 * Get the current play rate, playrate affects how fast an animated object animates.
	 * Also see {@link Zinc.Scene#duration}.
	 */
	this.setMorphsTime = function(time) {
		currentScene.setMorphsTime(time);
	}
	
	/**
	 * Get {Zinc.Geoemtry} by its id. This should be called from {@link Zinc.Scene};
	 * 
	 * @depreacted
	 * @return {Zinc.Geometry}
	 */
	this.getZincGeometryByID = function(id) {
		return currentScene.getZincGeometryByID(id);
	}	
	
	/**
	 * Add {Three.Object} to the current scene.
	 */
	this.addToScene = function(object) {
		currentScene.addObject(object)
	}
	
	/**
	 * Add {Three.Object} to the ortho scene, objects added to the ortho scene are rendered in
	 * normalised coordinates and overlay on top of current scene.  
	 * 
	 */
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
	
	/**
	 * Render the current and all additional scenes. It will first update all geometries and glyphsets
	 * in scenes, clear depth buffer and render the ortho scene, call the preRenderCallbackFunctions stack
	 * and finally render the scenes.
	 */
	this.render = function() {
		var rect = container.getBoundingClientRect();
		
		if (currentSize[0] != container.clientWidth || currentSize[1] != container.clientHeight ||
				rect.left != currentOffset[0] || rect.top != currentOffset[1]) {
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
	
	/**
	 * Get the internal {@link Three.Renderer}, to gain access to ThreeJS APIs.
	 */
	this.getThreeJSRenderer = function () {
		return renderer;
	}
	
	/**
	 * Check if a scene is currently active.
	 * @param {Zinc.Scene} sceneIn - Scene to check if it is currently
	 * rendered.
	 */
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
	
	/**
	 * Add additional active scene for rendering, this scene will also be rendered but 
	 * viewport of the currentScene will be used. 
	 * @param {Zinc.Scene} additionalScene - Scene to be added to the rendering.
	 */
	this.addActiveScene = function(additionalScene) {
		if (!_this.isSceneActive(additionalScene)) {
			additionalActiveScenes.push(additionalScene);
			scenesGroup.add(additionalScene.getThreeJSScene());
		}
	}
	
	/**
	 * Remove a currenrtly active scene from the renderer, this scene will also be rendered but 
	 * viewport of the currentScene will be used. 
	 * @param {Zinc.Scene} additionalScene - Scene to be removed from rendering.
	 */
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
	
	/**
	 * Clear all additional scenes from rendering except for curentScene.
	 */
	this.clearAllActiveScene = function() {
		for (var i = 0; i < additionalActiveScenes.length; i++) {
			scenesGroup.remove(additionalActiveScenes[i].getThreeJSScene());
		}
		additionalActiveScenes.splice(0,additionalActiveScenes.length);
	}
	
	/**
	 * Transition from the current viewport to the endingScene's viewport in the specified duration.
	 * 
	 * @param {Zinc.Scene} endingScene - Viewport of this scene will be used as the destination.
	 * @param {Number} duration - Amount of time to transition from current viewport to the 
	 * endingScene's viewport.
	 */
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


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

var THREE = __webpack_require__(1);

/**
 * A Zinc.Scene contains {@link Zinc.Geometry}, {@link Zinc.Glyphset} and 
 * {@link Zinc.CameraControls} which controls the viewport and additional features.
 * It is the main object used for controlling what is and what is not displayed
 * on the renderer.
 * 
 * @class
 * @param {Object} containerIn - Container to create the renderer on.
 * @author Alan Wu
 * @return {Zinc.Scene}
 */
exports.Scene = function ( containerIn, rendererIn) {
	var container = containerIn;
	var zincGeometries = [];
	var zincGlyphsets = [];
	var scene = new THREE.Scene();
	/**
	 * A {@link THREE.DirectionalLight} object for controlling lighting of this scene.
	 */
	this.directionalLight = undefined;
	/**
	 * a {@link THREE.AmbientLight} for controlling the ambient lighting of this scene.
	 */
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
	
	/**
	 * This function returns a three component array, which contains
	 * [totalsize, totalLoaded and errorDownload] of all the downloads happening
	 * in this scene.
	 * @returns {Array} 
	 */
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
	
	//Stores the current progress of downloads
	this.onProgress = function(id) {
	    return function(xhr){
	    	_this.progressMap[id] = [xhr.loaded, xhr.total];
	    }
	}

	this.onError = function ( xhr ) {
		errorDownload = true;
	};
	
	//called from Renderer when panel has been resized
	this.onWindowResize = function() {
		zincCameraControls.onResize();
		_this.camera.aspect = container.clientWidth / container.clientHeight;
		_this.camera.updateProjectionMatrix();
	}
	
	/**
	 * Reset the viewport of this scene to its original state. 
	 */
	this.resetView = function()
	{
		_this.onWindowResize();
		zincCameraControls.resetView();
	}
	
	//Setup the camera for this scene, it also initialise the lighting
	var setupCamera = function() {
		_this.camera = new THREE.PerspectiveCamera( 40, container.clientWidth / container.clientHeight, 0.0, 10.0);
		_this.ambient = new THREE.AmbientLight( 0x202020 );
		scene.add( _this.ambient );
	
		_this.directionalLight = new THREE.DirectionalLight( 0x777777  );
		scene.add( _this.directionalLight );

		zincCameraControls = new Zinc.CameraControls( _this.camera, rendererIn.domElement, rendererIn, scene );

		zincCameraControls.setDirectionalLight(_this.directionalLight);
		zincCameraControls.resetView();
	}
	
	setupCamera();
	
	//Get the next available unique identifier for Zinc.Geometry
	var nextAvailableInternalZincModelId = function() {
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
	
	/**
	 * Load the viewport Data from the argument  {@link Zinc.Viewport} and set it as 
	 * the default viewport of this scene.
	 * 
	 * @param {Zinc.Viewport} viewData - Viewport data to be loaded. 
	 */
	this.loadView = function(viewData)
	{
		var viewPort = new Zinc.Viewport();
		viewPort.nearPlane = viewData.nearPlane;
		viewPort.farPlane = viewData.farPlane;
		viewPort.eyePosition = viewData.eyePosition;
		viewPort.targetPosition = viewData.targetPosition;
		viewPort.upVector = viewData.upVector;
		zincCameraControls.setDefaultCameraSettings(viewPort);
		zincCameraControls.resetView();
	}
	
	/**
	 * Get the bounding box of all the object in this scene only.
	 * 
	 * @returns {THREE.Box3} 
	 */
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
	
	/**
	 * Adjust the viewport to display the desired volume provided by the bounding box.
	 * 
	 * @param {THREE.Box3} boundingBox - The bounding box which describes the volume of
	 * which we the viewport should be displaying.
	 */
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

	/**
	 * Adjust zoom distance to include all primitives in scene only.
	 */
	this.viewAll = function() {
		var boundingBox = _this.getBoundingBox();
		_this.viewAllWithBoundingBox(boundingBox);
	}
	
	/**
	 * A function which iterates through the list of geometries and call the callback
	 * function with the geometries as the argument.
	 * @param {Function} callbackFunction - Callback function with the geometry
	 * as an argument.
	 */
	this.forEachGeometry = function(callbackFunction) {
		for ( var i = 0; i < zincGeometries.length; i ++ ) {
			callbackFunction(zincGeometries[i]);
		}
	}
	
	/**
	 * A function which iterates through the list of glyphsets and call the callback
	 * function with the glyphset as the argument.
	 * @param {Function} callbackFunction - Callback function with the glyphset
	 * as an argument.
	 */
	this.forEachGlyphset = function(callbackFunction) {
		for ( var i = 0; i < zincGlyphsets.length; i ++ ) {
			callbackFunction(zincGlyphsets[i]);
		}
	}
	
	/** 
	 * Find and return all geometries in this scene with the matching GroupName.
	 * 
	 * @param {String} GroupName - Groupname to match with.
	 * @returns {Array}
	 */
	this.findGeometriesWithGroupName = function(GroupName) {
		var geometriesArray = [];
		for ( var i = 0; i < zincGeometries.length; i ++ ) {
			if (zincGeometries[i].groupName == GroupName) {
				geometriesArray.push(zincGeometries[i]);
			}
		}
		return geometriesArray;
	}
	
	/** 
	 * Find and return all glyphsets in this scene with the matching GroupName.
	 * 
	 * @param {String} GroupName - Groupname to match with.
	 * @returns {Array}
	 */
	this.findGlyphsetsWithGroupName = function(GroupName) {
		var glyphsetsArray = [];
		for ( var i = 0; i < zincGlyphsets.length; i ++ ) {
			if (zincGlyphsets[i].groupName == GroupName) {
				glyphsetsArray.push(zincGlyphsets[i]);
			}
		}
		return glyphsetsArray;
	}
	
	//Load a glyphset into this scene.
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
	
	//Load a glyphset into this scene.
	var onLoadGlyphsetReady = function(xmlhttp, glyphurl, groupName, finishCallback) {
		return function() {
			if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
				var glyphsetData = JSON.parse(xmlhttp.responseText);
	        	loadGlyphset(glyphsetData, glyphurl, groupName, finishCallback);
			}
		}
	}
	
	/**
	 * Load a glyphset into this scene object.
	 * 
	 * @param {String} metaurl - Provide informations such as transformations, colours 
	 * and others for each of the glyph in the glyphsset.
	 * @param {String} glyphurl - regular json model file providing geometry of the glyph.
	 * @param {String} groupName - name to assign the glyphset's groupname to.
	 * @param {Function} finishCallback - Callback function which will be called
	 * once the glyphset is succssfully load in.
	 */
	this.loadGlyphsetURL = function(metaurl, glyphurl, groupName, finishCallback)
	{
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = onLoadGlyphsetReady(xmlhttp, glyphurl, groupName, finishCallback);
		xmlhttp.open("GET", metaurl, true);
		xmlhttp.send();
	}
	
	/**
	 * Load a geometry into this scene, this is a subsequent called from 
	 * {@link Zinc.Scene#loadMetadataURL}, although it can be used to read
	 * in geometry into the scene externally.
	 * 
	 * @param {String} url - regular json model file providing geometry.
	 * @param {Boolean} timeEnabled - Indicate if geometry morphing is enabled.
	 * @param {Boolean} morphColour - Indicate if color morphing is enabled.
	 * @param {STRING} groupName - name to assign the geometry's groupname to.
	 * @param {STRING} fileFormat - name supported formats are STL, OBJ and JSON.
	 * @param {Function} finishCallback - Callback function which will be called
	 * once the geometry is succssfully loaded in.
	 */
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
	
	//Function to process each of the metadata item. There are two types of metadata item,
	//one for Zinc.Geometry and one for Zinc.Glyphset.
	var readMetadataItem = function(item, finishCallback) {
		if (item) {
			if (item.Type == "Surfaces") {
				loadMetaModel(item.URL, item.MorphVertices, item.MorphColours, item.GroupName, item.FileFormat, finishCallback);
			} else if (item.Type == "Glyph") {
				_this.loadGlyphsetURL(item.URL, item.GlyphGeometriesURL, item.GroupName, finishCallback);
			}
		}
	}
	
	/**
	 * Read a STL file into this scene, the geometry will be presented as
	 * {@link Zinc.Geometry}. 
	 * 
	 * @param {STRING} url - location to the STL file.
	 * @param {STRING} groupName - name to assign the geometry's groupname to.
	 * @param {Function} finishCallback - Callback function which will be called
	 * once the STL geometry is succssfully loaded.
	 */
	this.loadSTL = function(url, groupName, finishCallback) {
		num_inputs += 1;
        var modelId = nextAvailableInternalZincModelId();
        var colour = Zinc.defaultMaterialColor;
        var opacity = Zinc.defaultOpacity;
		var loader = new THREE.STLLoader( );
		loader.load( url, meshloader(modelId, colour, opacity, false,
        	false, groupName, finishCallback)); 
	}
	
	/**
	 * Read a OBJ file into this scene, the geometry will be presented as
	 * {@link Zinc.Geometry}. 
	 * 
	 * @param {STRING} url - location to the STL file.
	 * @param {STRING} groupName - name to assign the geometry's groupname to.
	 * @param {Function} finishCallback - Callback function which will be called
	 * once the OBJ geometry is succssfully loaded.
	 */
	this.loadOBJ = function(url, groupName, finishCallback) {
		num_inputs += 1;
        var modelId = nextAvailableInternalZincModelId();
        var colour = Zinc.defaultMaterialColor;
        var opacity = Zinc.defaultOpacity;
		var loader = new THREE.OBJLoader( );
		loader.load( url, meshloader(modelId, colour, opacity, false,
        	false, groupName, finishCallback)); 
	}

	/**
	 * Load a metadata file from the provided URL into this scene. Once
	 * succssful scene proceeds to read each items into scene for visualisations.
	 * 
	 * @param {String} url - Location of the metafile
	 * @param {Function} finishCallback - Callback function which will be called
	 * for each glyphset and geometry that has been written in.
	 */
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

	/**
	 * Load a legacy model(s) format with the provided URLs and parameters. This only loads the geometry
	 * without any of the metadata. Therefore, extra parameters should be provided.
	 * 
	 * @deprecated
	 */
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
	
	/**
	 * Load the viewport from an external location provided by the url.
	 * @param {String} URL - address to the file containing viewport information.
	 */
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
	
	/**
	 * Load a legacy file format containing the viewport and its model file from an external 
	 * location provided by the url. Use the new metadata format with
	 * {@link Zinc.Scene#loadMetadataURL} instead.
	 * 
	 * @param {String} URL - address to the file containing viewport and model information.
	 * @deprecated
	 */
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
	
	//Internal function for creating a Zinc.Geometry object and add it into the scene for rendering.
	var addMeshToZincGeometry = function(mesh, modelId, localTimeEnabled, localMorphColour) {
		var newGeometry = new Zinc.Geometry();
		scene.add( mesh );
		var mixer = new THREE.AnimationMixer(mesh);
		var clipAction = undefined;
		var geometry = mesh.geometry;
		if (geometry.morphTargets)
		{
			var animationClip = THREE.AnimationClip.CreateClipsFromMorphTargetSequences( geometry.morphTargets, 10, true );
			if (animationClip && animationClip[0] != undefined) {
				var clipAction =  mixer.clipAction(animationClip[0]).setDuration(duration);
				clipAction.loop = THREE.loopOnce;
				clipAction.clampWhenFinished = true;
				clipAction.play();
			}
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
	
	//Loader for the OBJ format, 
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
	
	/**
	 * Add a user provided {THREE.Geometry} into  the scene as zinc geometry.
	 * 
	 * @param {Three.Geometry} geometry - The threejs geometry to be added as {@link Zinc.Geometry}.
	 * @param {Number} modelId - The numeric ID to be given to the newly created geometry.
	 * @param {THREE.Color} color - Colour to be assigned to this geometry, overrided if materialIn is provided.
	 * @param {Number} opacity - Opacity to be set for this geometry, overrided if materialIn is provided.
	 * @param {Boolean} localTimeEnabled - Set this to true if morph geometry is present, overrided if materialIn is provided.
	 * @param {Boolean} localMorphColour - Set this to true if morph colour is present, overrided if materialIn is provided.
	 * @param {Boolean} external - Set this to true if morph geometry is present, overrided if materialIn is provided.
	 * @param {Function} finishCallback - Callback once the geometry has been added succssfully.
	 * @param {THREE.Material} materialIn - Material to be set for this geometry if it is present.
	 * 
	 * @returns {Zinc.Geometry}
	 */
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
	
	//Internal loader for a regular zinc geometry.
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
	
	//Update the directional light for this scene.
	this.updateDirectionalLight = function() {
		zincCameraControls.updateDirectionalLight();
	}
	
	/**
	 * Add any {THREE.Object} into this scene.
	 * @param {THREE.Object} object - to be addded into this scene.
	 */
	this.addObject = function(object) {
		scene.add(object);
	}
	
	/**
	 * Get the current time of the scene.
	 * @return {Number}
	 */
	this.getCurrentTime = function() {
		var currentTime = 0;
		if (zincGeometries[0] != undefined)
		{
			var mixer = zincGeometries[0].mixer;
			currentTime = zincGeometries[0].getCurrentTime();
		}
		return currentTime;
	}
	
	
	/**
	 * Set the current time of all the geometries and glyphsets of this scene.
	 * @param {Number} time  - Value to set the time to.
	 */
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
	
	/**
	 * Get {Zinc.Geoemtry} in this scene by its id.
	 * @return {Zinc.Geometry}
	 */
	this.getZincGeometryByID = function(id) {
		for ( var i = 0; i < zincGeometries.length; i ++ ) {
			if (zincGeometries[i].modelId == id)
			{
				return zincGeometries[i];
			}
		}
		
		return null;
	}
	
	// Used to check if all glyphsets are ready.
	var allGlyphsetsReady = function() {
		for ( var i = 0; i < zincGlyphsets.length; i ++ ) {
			zincGlyphset = zincGlyphsets[i];
			if (zincGlyphset.ready == false)
				return false;
		}
		return true;
		
	}
	
	/**
	 * Update geometries and glyphsets based on the calculated time.
	 * @private
	 */
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
	
	/**
	 * Return the internal {THREE.Scene}.
	 * @return {THREE.Scene}
	 */
	this.getThreeJSScene = function() {
		return scene;
	}
	
	/**
	 * Set a group of scenes into this parent scene. This group of
	 * scenes will also be rendered when this scene is rendered.
	 * @private
	 */
	this.setAdditionalScenesGroup = function(scenesGroup) {
		scene.add(scenesGroup);
	}
	
	/**
	 * Render the scene.
	 * @private
	 */
	this.render = function(renderer) {
		if (_this.autoClearFlag)
			renderer.clear();
		if (stereoEffectFlag && stereoEffect) {
			stereoEffect.render(scene, _this.camera);
		}
		else
			renderer.render( scene, _this.camera );
	}
	
	/**
	 * Enable or disable interactive control, this is on by default.
	 * 
	 * @param {Boolean} flag - Indicate either interactive control 
	 * should be enabled or disabled.
	 */
	this.setInteractiveControlEnable = function(flag) {
		if (flag == true)
			zincCameraControls.enable();
		else
			zincCameraControls.disable();
	}
	
	/**
	 * Get the camera control of this scene.
	 * @return {Zinc.CameraControls}
	 */
	this.getZincCameraControls = function () {
		return zincCameraControls;
	}
	
	/**
	 * Get the internal {THREE.Scene}.
	 * @return {THREE.Scene}
	 */
	this.getThreeJSScene = function() {
		return scene;
	}
	
	/**
	 * Set the default duration value for geometries and glyphsets that are to be loaded
	 * into this scene.
	 * @param {Number} durationIn - duration of the scene.
	 */
	this.setDuration = function(durationIn) {
		duration = durationIn;
	}
	
	/**
	 * Get the default duration value.
	 * returns {Number}
	 */
	this.getDuration = function() {
		return duration;
	}
	
	/**
	 * Enable or disable stereo effect of this scene.
	 * @param {Boolean} flag - Indicate either stereo effect control 
	 * should be enabled or disabled.
	 */
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
	
	/**
	 * Check if stereo effect is enabled.
	 * @returns {Boolean}
	 */
	this.isStereoEffectEnable = function() {
		return stereoEffectFlag;
	}
	
	/**
	 * Remove a ZincGeometry from this scene if it presents. This will eventually
	 * destroy the geometry and free up the memory.
	 * @param {Zinc.Geometry} zincGeometry - geometry to be removed from this scene.
	 */
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
	
	/**
	 * Remove a ZincGlyphset from this scene if it presents. This will eventually
	 * destroy the glyphset and free up the memory.
	 * @param {Zinc.Glyphset} zincGlyphset - geometry to be removed from this scene.
	 */
	this.removeZincGlyphset = function(zincGlyphset) {
		for ( var i = 0; i < zincGlyphsets.length; i ++ ) {
			if (zincGlyphset === zincGlyphsets[i]) {
				scene.remove(zincGlyphset.getGroup());
				zincGlyphsets[i].dispose();
				zincGlyphsets.splice(i,1);
				return;
			}
		}
	}
	
	/**
	 * Remove all objects that are created with ZincJS APIs and it will free the memory allocated.

	 */
	this.clearAll = function() {
		for( var i = zincGeometries.length - 1; i >= 0; i--) {
			scene.remove(zincGeometries[i].morph);
			zincGeometries[i].dispose();
		}
		zincGeometries = [];
		for( var i = zincGlyphsets.length - 1; i >= 0; i--) {
			scene.remove(zincGlyphsets[i].getGroup());
			zincGlyphsets[i].dispose();
		}
		zincGlyphsets = [];		
	}
}


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

var THREE = __webpack_require__(1);

exports.Viewport = function () {
	this.nearPlane = 0.1;
	this.farPlane = 2000.0;
	this.eyePosition = [0.0, 0.0, 0.0];
	this.targetPosition = [0.0, 0.0, 0.0];
	this.upVector = [ 0.0, 1.0, 0.0];
	var _this = this;
}

exports.CameraControls = function ( object, domElement, renderer, scene ) {

	var _this = this;
	var MODE = { NONE: -1, DEFAULT: 0, PATH: 1, SMOOTH_CAMERA_TRANSITION: 2, AUTO_TUMBLE: 3 };
	var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM: 4, TOUCH_PAN: 5, SCROLL: 6 };
	var CLICK_ACTION = {};
	CLICK_ACTION.MAIN = STATE.ROTATE;
	CLICK_ACTION.AUXILIARY = STATE.PAN;
	CLICK_ACTION.SECONDARY = STATE.ZOOM;
	this.cameraObject = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;
	this.renderer = renderer;
	this.scene = scene ;
	this.tumble_rate = 1.5;
	this.pointer_x = 0;
	this.pointer_y = 0;
	this.pointer_x_start = 0;
	this.pointer_y_start = 0;
	this.previous_pointer_x = 0;
	this.previous_pointer_y = 0;
	this.near_plane_fly_debt = 0.0;
	this.touchZoomDistanceStart = 0;
	this.touchZoomDistanceEnd = 0;
	this.directionalLight = 0;
	this.scrollRate = 50;
	var duration = 3000;
	var inbuildTime = 0;
	var cameraPath = undefined;
	var numerOfCameraPoint = undefined;
	var updateLightWithPathFlag = false;
	var playRate = 500;
	var deviceOrientationControl = undefined;
	var defaultViewport = new Zinc.Viewport();
	var currentMode = MODE.DEFAULT;
	var smoothCameraTransitionObject = undefined;
	var cameraAutoTumbleObject = undefined;
	var mouseScroll = 0;
	this._state = STATE.NONE;
	var zincRayCaster = undefined;
	this.targetTouchId = -1;
	var rect = undefined;
	if (_this.cameraObject.target === undefined)
		_this.cameraObject.target = new THREE.Vector3( 0, 0, 0  );
	
	this.onResize = function() {
		if (rect)
			rect = undefined;
	}
	
	this.setMouseButtonAction = function(buttonName, actionName) {
		CLICK_ACTION[buttonName] = STATE[actionName];
	}
	
	function onDocumentMouseDown( event ) {
		if (rect === undefined)
			rect = _this.domElement.getBoundingClientRect();
		if (event.button == 0) { 
	 		_this._state = CLICK_ACTION.MAIN;
		} else if (event.button == 1) {
			event.preventDefault();
			_this._state = CLICK_ACTION.AUXILIARY;
	    } 
	   	else if (event.button == 2) {
	    	_this._state = CLICK_ACTION.SECONDARY;
	    }
		_this.pointer_x = event.clientX - rect.left;
		_this.pointer_y = event.clientY - rect.top;
		_this.pointer_x_start = _this.pointer_x;
		_this.pointer_y_start = _this.pointer_y;
		_this.previous_pointer_x = _this.pointer_x;
		_this.previous_pointer_y= _this.pointer_y;
	}

	function onDocumentMouseMove( event ) {
		if (rect === undefined)
			rect = _this.domElement.getBoundingClientRect();
		_this.pointer_x = event.clientX - rect.left;
		_this.pointer_y = event.clientY - rect.top;
		
		if (zincRayCaster !== undefined) {
			zincRayCaster.move(_this, event.clientX, event.clientY, _this.renderer);
		}
	}
	
	function onDocumentMouseUp( event ) {
		_this._state = STATE.NONE;
		if (zincRayCaster !== undefined) {
			if (_this.pointer_x_start==(event.clientX - rect.left) && _this.pointer_y_start==(event.clientY- rect.top)) {
				zincRayCaster.pick(_this, event.clientX, event.clientY, _this.renderer);
			}
		}
	}
	
	function onDocumentMouseLeave( event ) {
		_this._state = STATE.NONE;
	}
	
	function onDocumentTouchStart( event ) {
		if (rect === undefined)
			rect = _this.domElement.getBoundingClientRect();
		var len = event.touches.length;
		if (len == 1) {
			_this._state = STATE.TOUCH_ROTATE;
			_this.pointer_x = event.touches[0].clientX - rect.left;
			_this.pointer_y = event.touches[0].clientY - rect.top;
			_this.pointer_x_start = _this.pointer_x;
			_this.pointer_y_start = _this.pointer_y;
			_this.previous_pointer_x = _this.pointer_x;
			_this.previous_pointer_y= _this.pointer_y;
		} else if (len == 2) {
			_this._state = STATE.TOUCH_ZOOM;
			var dx = event.touches[ 0 ].clientX - event.touches[ 1 ].clientX;
			var dy = event.touches[ 0 ].clientY - event.touches[ 1 ].clientY;
			_this.touchZoomDistanceEnd = _this.touchZoomDistanceStart = Math.sqrt( dx * dx + dy * dy );
		} else if (len == 3) {
			_this._state = STATE.TOUCH_PAN;
			_this.targetTouchId = event.touches[0].identifier;
			_this.pointer_x = event.touches[0].clientX - rect.left;
			_this.pointer_y = event.touches[0].clientY - rect.top;
			_this.previous_pointer_x = _this.pointer_x;
			_this.previous_pointer_y= _this.pointer_y;			
		}
	}
	
	function onDocumentTouchMove( event ) {
		event.preventDefault();
		event.stopPropagation();
		var len = event.touches.length
		if (len == 1) {
			_this.pointer_x = event.touches[0].clientX - rect.left;
			_this.pointer_y = event.touches[0].clientY - rect.top;
		} else if (len == 2) {
			if (_this._state === STATE.TOUCH_ZOOM) {
				var dx = event.touches[ 0 ].clientX - event.touches[ 1 ].clientX;
				var dy = event.touches[ 0 ].clientY - event.touches[ 1 ].clientY;
				_this.touchZoomDistanceEnd = Math.sqrt( dx * dx + dy * dy );
			}
		} else if (len == 3) {
			if (_this._state === STATE.TOUCH_PAN) {
				for (var i = 0; i < 3; i++) {
					if (event.touches[i].identifier == _this.targetTouchId) {
						_this.pointer_x = event.touches[0].clientX - rect.left;
						_this.pointer_y = event.touches[0].clientY - rect.top;
					}
				}
			}				
		}
	}
	
	function onDocumentTouchEnd( event ) {
		var len = event.touches.length
		_this.touchZoomDistanceStart = _this.touchZoomDistanceEnd = 0;
		_this.targetTouchId = -1;
		_this._state = STATE.NONE;
		if (len == 1) {
			if (zincRayCaster !== undefined) {
				if (_this.pointer_x_start==(event.touches[0].clientX- rect.left) && _this.pointer_y_start==(event.touches[0].clientY- rect.top)) {
					zincRayCaster.pick(_this.cameraObject, event.touches[0].clientX, event.touches[0].clientY, _this.renderer);
				}
			}
		}
	}
	
	function onDocumentWheelEvent( event ) {
		if (rect === undefined)
			rect = _this.domElement.getBoundingClientRect();
		_this._state = STATE.SCROLL;
		var changes = 0;
		if (event.deltaY > 0)
			changes = _this.scrollRate;
		else if (event.deltaY < 0)
			changes = _this.scrollRate * -1;
		mouseScroll = mouseScroll + changes;
		event.preventDefault(); 
		event.stopImmediatePropagation();  
	}	


	function translate()
	{
		if (typeof _this.cameraObject !== "undefined")
		{
			var width = rect.width;
			var height = rect.height;
			var distance = _this.cameraObject.position.distanceTo(_this.cameraObject.target)
			var fact = 0.0;
			if ((_this.cameraObject.far > _this.cameraObject.near) && (distance >= _this.cameraObject.near) &&
				(distance <= _this.cameraObject.far))
			{
				 fact = (distance-_this.cameraObject.near)/(_this.cameraObject.far-_this.cameraObject.near);
			}
			var old_near = new THREE.Vector3(_this.previous_pointer_x,height - _this.previous_pointer_y,0.0);
			var old_far = new THREE.Vector3(_this.previous_pointer_x, height - _this.previous_pointer_y,1.0);
			var new_near = new THREE.Vector3(_this.pointer_x,height - _this.pointer_y,0.0);
			var new_far = new THREE.Vector3(_this.pointer_x,height - _this.pointer_y,1.0);
			old_near.unproject(_this.cameraObject);
			old_far.unproject(_this.cameraObject);
			new_near.unproject(_this.cameraObject);
			new_far.unproject( _this.cameraObject);
			var translate_rate = 0.002;
			var dx=translate_rate*((1.0-fact)*(new_near.x-old_near.x) + fact*(new_far.x-old_far.x));
			var dy=translate_rate*((1.0-fact)*(new_near.y-old_near.y) + fact*(new_far.y-old_far.y));
			var dz=translate_rate*((1.0-fact)*(new_near.z-old_near.z) + fact*(new_far.z-old_far.z));
			_this.cameraObject.position.set(_this.cameraObject.position.x - dx, _this.cameraObject.position.y - dy, _this.cameraObject.position.z - dz);
			_this.updateDirectionalLight();
			_this.cameraObject.target.set(_this.cameraObject.target.x - dx, _this.cameraObject.target.y - dy, _this.cameraObject.target.z - dz);
		}
		_this.previous_pointer_x = _this.pointer_x;
		_this.previous_pointer_y = _this.pointer_y;
	}
	
	this.rotateAboutLookAtpoint = function(a, angle)
	{
		a.normalize()
		var v = _this.cameraObject.position.clone();
		
		v.sub(_this.cameraObject.target)
		var rel_eye = v.clone()
		v.normalize()
		if (0.8 < Math.abs(v.x*a.x+v.y*a.y+v.z*a.z)) {
			v = _this.cameraObject.up.clone();
		}
		var b = new THREE.Vector3 (a.y*v.z-a.z*v.y, a.z*v.x-a.x*v.z, a.x*v.y-a.y*v.x);
		b.normalize()
		var c = new THREE.Vector3 (a.y*b.z-a.z*b.y, a.z*b.x-a.x*b.z, a.x*b.y-a.y*b.x);
		var rel_eyea = a.x*rel_eye.x+a.y*rel_eye.y+a.z*rel_eye.z;
		var rel_eyeb = b.x*rel_eye.x+b.y*rel_eye.y+b.z*rel_eye.z;
		var rel_eyec = c.x*rel_eye.x+c.y*rel_eye.y+c.z*rel_eye.z;
		var upa = a.x*_this.cameraObject.up.x+a.y*_this.cameraObject.up.y+a.z*_this.cameraObject.up.z;
		var upb = b.x*_this.cameraObject.up.x+b.y*_this.cameraObject.up.y+b.z*_this.cameraObject.up.z;
		var upc = c.x*_this.cameraObject.up.x+c.y*_this.cameraObject.up.y+c.z*_this.cameraObject.up.z;
		var cos_angle = Math.cos(angle)
		var sin_angle = Math.sin(angle)
		var new_b = new THREE.Vector3(cos_angle*b.x+sin_angle*c.x,
									cos_angle*b.y+sin_angle*c.y,
									cos_angle*b.z+sin_angle*c.z);
		var new_c = new THREE.Vector3(cos_angle*c.x-sin_angle*b.x,
									cos_angle*c.y-sin_angle*b.y,
									cos_angle*c.z-sin_angle*b.z);								
		var eye_position = _this.cameraObject.target.clone()
		eye_position.x = eye_position.x + a.x*rel_eyea + new_b.x*rel_eyeb+new_c.x*rel_eyec
		eye_position.y = eye_position.y + a.y*rel_eyea + new_b.y*rel_eyeb+new_c.y*rel_eyec
		eye_position.z = eye_position.z + a.z*rel_eyea + new_b.z*rel_eyeb+new_c.z*rel_eyec
		_this.cameraObject.position.set(eye_position.x, eye_position.y, eye_position.z);
		_this.updateDirectionalLight();
		_this.cameraObject.up.set(a.x*upa+new_b.x*upb+new_c.x*upc,
					a.y*upa+new_b.y*upb+new_c.y*upc,
					a.z*upa+new_b.z*upb+new_c.z*upc);
	}

	function tumble()
	{
		if (typeof _this.cameraObject !== "undefined")
		{
			var width = rect.width;
			var height = rect.height;
			if ((0<width)&&(0<height))
			{
				var radius=0.25*(width+height);
				delta_x=_this.pointer_x-_this.previous_pointer_x;
				delta_y=_this.previous_pointer_y-_this.pointer_y;
				var tangent_dist = Math.sqrt(delta_x*delta_x + delta_y*delta_y)
				if (tangent_dist > 0)
				{
					var dx=-delta_y*1.0/tangent_dist;
					var dy=delta_x*1.0/tangent_dist;
					var d=dx*(_this.pointer_x-0.5*(width-1))+dy*(0.5*(height-1)-_this.pointer_y);
					if (d > radius)	{
						d = radius;
					}
					else {
						if (d < -radius) {
							d = -radius;
						}
					}
					var phi=Math.acos(d/radius)-0.5*Math.PI;
					var angle=_this.tumble_rate*tangent_dist/radius;
					var a = _this.cameraObject.position.clone();
					a.sub(_this.cameraObject.target);
					a.normalize();
					
					var b = _this.cameraObject.up.clone();
					b.normalize();
					
					var c = b.clone();
					c.cross(a);
					c.normalize();

					var e = [dx*c.x + dy*b.x, dx*c.y + dy*b.y, dx*c.z + dy*b.z];
					var axis = new THREE.Vector3()
					axis.set(Math.sin(phi)*a.x+Math.cos(phi)*e[0],
						Math.sin(phi)*a.y+Math.cos(phi)*e[1],
						Math.sin(phi)*a.z+Math.cos(phi)*e[2]);
					_this.rotateAboutLookAtpoint(axis, -angle);
				}
			}
		}
		_this.previous_pointer_x = _this.pointer_x;
		_this.previous_pointer_y = _this.pointer_y;
	}
	
	function calculateZoomDelta()
	{
		var delta = 0;
		if (_this._state === STATE.ZOOM)
		{
			delta = _this.previous_pointer_y-_this.pointer_y;
		} else if (_this._state === STATE.SCROLL) {
			delta = mouseScroll;
		} else {
			delta = -1.0 * (_this.touchZoomDistanceEnd - _this.touchZoomDistanceStart);
			_this.touchZoomDistanceStart = _this.touchZoomDistanceEnd;
		}
		return delta;
	}
	
	function flyZoom() {
		if (typeof _this.cameraObject !== "undefined")
		{
			var width = rect.width;
			var height = rect.height;
			var a = _this.cameraObject.position.clone();
			a.sub(_this.cameraObject.target);
			
			var delta_y=calculateZoomDelta();

			var dist = a.length()				
			var dy = 1.5 * delta_y/height;
			if ((dist + dy*dist) > 0.01) {
				a.normalize()
				var eye_position = _this.cameraObject.position.clone()
				eye_position.x = eye_position.x + a.x*dy*dist
				eye_position.y = eye_position.y + a.y*dy*dist
				eye_position.z = eye_position.z + a.z*dy*dist
				_this.cameraObject.position.set(eye_position.x, eye_position.y, eye_position.z);
				_this.updateDirectionalLight();
				var near_far_minimum_ratio = 0.00001;
				if ((near_far_minimum_ratio * _this.cameraObject.far) <
					(_this.cameraObject.near + dy*dist + _this.near_plane_fly_debt)) {
					if (_this.near_plane_fly_debt != 0.0)	{
						_this.near_plane_fly_debt += dy*dist;
						if (_this.near_plane_fly_debt > 0.0) {
							_this.cameraObject.near += _this.near_plane_fly_debt;
							_this.cameraObject.far += _this.near_plane_fly_debt;
							_this.near_plane_fly_debt = 0.0;
						}
						else {
							_this.cameraObject.near += dy*dist;
							_this.cameraObject.far += dy*dist;
						}
					}			
				}
				else {
					if (_this.near_plane_fly_debt == 0.0) {
						var diff = _this.cameraObject.near - near_far_minimum_ratio * _this.cameraObject.far;
						_this.cameraObject.near = near_far_minimum_ratio * _this.cameraObject.far;
						_this.cameraObject.far -= diff;
						_this.near_plane_fly_debt -= near_far_minimum_ratio * _this.cameraObject.far;
					}
					_this.near_plane_fly_debt += dy*dist;
				}
				
			}
		}
		if (_this._state === STATE.ZOOM) {
			_this.previous_pointer_x = _this.pointer_x;
			_this.previous_pointer_y = _this.pointer_y;
		}
		if (_this._state === STATE.SCROLL) {
			mouseScroll = 0;
		}
	}
	
	this.setDirectionalLight = function (directionalLightIn) {
		_this.directionalLight = directionalLightIn;
	};
	
	this.updateDirectionalLight = function() {
		if (_this.directionalLight != 0) {
			_this.directionalLight.position.set(_this.cameraObject.position.x,
					_this.cameraObject.position.y,
					_this.cameraObject.position.z);
		}
	}
	
	
	this.enable = function () {
		enabled = true;
		if (this.domElement.addEventListener) {
			this.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
			this.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
			this.domElement.addEventListener( 'mouseup', onDocumentMouseUp, false );
			this.domElement.addEventListener( 'mouseleave', onDocumentMouseLeave, false );
			this.domElement.addEventListener( 'touchstart', onDocumentTouchStart, false);
			this.domElement.addEventListener( 'touchmove', onDocumentTouchMove, false);
			this.domElement.addEventListener( 'touchend', onDocumentTouchEnd, false);
			this.domElement.addEventListener( 'wheel', onDocumentWheelEvent, false);
			this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	    }
	}
	
	this.disable = function () {
		enabled = false;
		if (this.domElement.removeEventListener) {
			this.domElement.removeEventListener( 'mousedown', onDocumentMouseDown, false );
			this.domElement.removeEventListener( 'mousemove', onDocumentMouseMove, false );
			this.domElement.removeEventListener( 'mouseup', onDocumentMouseUp, false );
			this.domElement.removeEventListener( 'mouseleave', onDocumentMouseLeave, false );
			this.domElement.removeEventListener( 'touchstart', onDocumentTouchStart, false);
			this.domElement.removeEventListener( 'touchmove', onDocumentTouchMove, false);
			this.domElement.removeEventListener( 'touchend', onDocumentTouchEnd, false);
			this.domElement.removeEventListener( 'wheel', onDocumentWheelEvent, false);
			this.domElement.removeEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	    }
	}
	

	var loadPath = function(pathData)
	{
		cameraPath = pathData.CameraPath;
		numerOfCameraPoint = pathData.NumberOfPoints;
	}
	
	this.loadPathURL = function(path_url, finishCallback)
	{
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = function() {
		    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
		        var pathData = JSON.parse(xmlhttp.responseText);
		        loadPath(pathData);
		    }
		}
		requestURL = path_url;
		xmlhttp.open("GET", requestURL, true);
		xmlhttp.send();
	}
	
	this.setPathDuration = function(durationIn) {
		duration = durationIn;
	}
	
	this.setTime = function(time) {
		inbuildTime = time;
	}
	
	this.setPlayRate = function(playRateIn) {
		playRate = playRateIn;
	}
	 
	var updateTime = function(delta) {
		var targetTime = inbuildTime + delta;
		if (targetTime > duration)
			targetTime = targetTime - duration
		inbuildTime = targetTime;
	}
	
	this.getNumberOfTimeFrame = function() {
		return numerOfCameraPoint;
	}
	
	this.getCurrentTimeFrame = function() {
		var current_time = inbuildTime/duration * (numerOfCameraPoint - 1);
		var bottom_frame =  Math.floor(current_time);
		var proportion = 1 - (current_time - bottom_frame);
		var top_frame =  Math.ceil(current_time);
		return [bottom_frame, top_frame, proportion];
	}
	
	this.setCurrentTimeFrame = function(targetTimeFrame) {
		inbuildTime = duration * targetTimeFrame / (numerOfCameraPoint - 1);
		if (inbuildTime < 0.0)
			inbuildTime = 0.0;
		if (inbuildTime > duration)
			inbuildTime = duration;	
	}

	var updatePath = function(delta)	{
		if (currentMode === MODE.PATH) {
			updateTime(delta);
			if (cameraPath) {
				var time_frame = _this.getCurrentTimeFrame();
				var bottom_frame = time_frame[0];
				var top_frame = time_frame[1];
				var proportion = time_frame[2];
	
				var bot_pos = [cameraPath[bottom_frame*3], cameraPath[bottom_frame*3+1], cameraPath[bottom_frame*3+2]];
				var top_pos = [cameraPath[top_frame*3], cameraPath[top_frame*3+1], cameraPath[top_frame*3+2]];
				var current_positions = [];
				for (var i = 0; i < bot_pos.length; i++) {
					current_positions.push(proportion * bot_pos[i] + (1.0 - proportion) * top_pos[i]);
				}
				_this.cameraObject.position.set(current_positions[0], current_positions[1], current_positions[2]);
				_this.cameraObject.target.set(top_pos[0], top_pos[1], top_pos[2]);
				if (updateLightWithPathFlag) {
					_this.directionalLight.position.set(current_positions[0], current_positions[1], current_positions[2]);
					_this.directionalLight.target.position.set(top_pos[0], top_pos[1], top_pos[2]);
				}					
			}
		}
	}
	
	this.update = function (timeChanged) {
		var delta = timeChanged * playRate;
		var controlEnabled = enabled;
		if (currentMode === MODE.PATH) {
			updatePath(delta);
		} else if (currentMode === MODE.SMOOTH_CAMERA_TRANSITION && smoothCameraTransitionObject) {
			smoothCameraTransitionObject.update(delta);
			if (smoothCameraTransitionObject.isTransitionCompleted()) {
				smoothCameraTransitionObject == undefined;
				currentMode = MODE.DEFAULT;
			}
			controlEnabled = false;
		} else if (currentMode === MODE.AUTO_TUMBLE && cameraAutoTumbleObject) {
			cameraAutoTumbleObject.update(delta);
		}
		if (controlEnabled) {
			if ((_this._state === STATE.ROTATE) || (_this._state === STATE.TOUCH_ROTATE)){
				tumble();
			} else if ((_this._state === STATE.PAN) || (_this._state === STATE.TOUCH_PAN)){
				translate();
			} else if ((_this._state === STATE.ZOOM) || (_this._state === STATE.TOUCH_ZOOM) || (_this._state === STATE.SCROLL)){
				flyZoom();
			}
			if (_this._state !== STATE.NONE) {
				if (currentMode === MODE.AUTO_TUMBLE && cameraAutoTumbleObject &&
						cameraAutoTumbleObject.stopOnCameraInput) {
				}
			}
			if (_this._state === STATE.SCROLL)
				_this._state = STATE.NONE;
		}
		if (deviceOrientationControl) {
			deviceOrientationControl.update();
			//_this.directionalLight.target.position.set(_this.cameraObject.target.x, 
			//	_this.cameraObject.target.y, _this.cameraObject.target.z);
		} else {
			_this.cameraObject.lookAt( _this.cameraObject.target );
		}
	};
	
	this.playPath = function () {
		currentMode = MODE.PATH;
	}
	
	this.stopPath = function () {
		currentMode = MODE.DEFAULT;
	}
	
	this.isPlayingPath = function () {
		return (currentMode === MODE.PATH);
	}
	
	this.enableDirectionalLightUpdateWithPath = function (flag) {
		updateLightWithPathFlag = flag;
	}
	
	this.enableDeviceOrientation = function() {
		if (!deviceOrientationControl)
			deviceOrientationControl = new ModifiedDeviceOrientationControls(_this.cameraObject);
	}
	
	this.disableDeviceOrientation = function() {
		if (deviceOrientationControl) {
			deviceOrientationControl.dispose();
			deviceOrientationControl = undefined;
		}
	}
	
	this.isDeviceOrientationEnabled = function() {
		if (deviceOrientationControl) {
			return true;
		}
		return false;
	}
	
	this.resetView = function() {
		_this.cameraObject.near = defaultViewport.nearPlane;
		_this.cameraObject.far = defaultViewport.farPlane;
		_this.cameraObject.position.set( defaultViewport.eyePosition[0], defaultViewport.eyePosition[1],
				defaultViewport.eyePosition[2]);
		_this.cameraObject.target.set( defaultViewport.targetPosition[0],
				defaultViewport.targetPosition[1], defaultViewport.targetPosition[2]  );
		_this.cameraObject.up.set( defaultViewport.upVector[0],  defaultViewport.upVector[1],
				defaultViewport.upVector[2]);
		_this.cameraObject.updateProjectionMatrix();
		_this.updateDirectionalLight();
	}
	
	this.setDefaultCameraSettings = function(newViewport) {
		if (newViewport.nearPlane)
			defaultViewport.nearPlane = newViewport.nearPlane;
		if (newViewport.farPlane)
			defaultViewport.farPlane = newViewport.farPlane;
		if (newViewport.eyePosition)
			defaultViewport.eyePosition = newViewport.eyePosition;
		if (newViewport.targetPosition)
			defaultViewport.targetPosition = newViewport.targetPosition;
		if (newViewport.upVector)
			defaultViewport.upVector = newViewport.upVector;	
	}
	
	this.setCurrentCameraSettings = function(newViewport) {
		if (newViewport.nearPlane)
			_this.cameraObject.near = newViewport.nearPlane;
		if (newViewport.farPlane)
			_this.cameraObject.far = newViewport.farPlane;
		if (newViewport.eyePosition)
			_this.cameraObject.position.set( newViewport.eyePosition[0], 
					newViewport.eyePosition[1], newViewport.eyePosition[2]);
		if (newViewport.targetPosition)
			_this.cameraObject.target.set( newViewport.targetPosition[0],
					newViewport.targetPosition[1], newViewport.targetPosition[2]  );
		if (newViewport.upVector)
			_this.cameraObject.up.set( newViewport.upVector[0], newViewport.upVector[1],
					newViewport.upVector[2]);
		_this.cameraObject.updateProjectionMatrix();
		_this.updateDirectionalLight();
	}
	
	this.getViewportFromCentreAndRadius = function(centreX, centreY, centreZ, radius, view_angle, clip_distance) {
		var eyex = _this.cameraObject.position.x-_this.cameraObject.target.x;
		var eyey = _this.cameraObject.position.y-_this.cameraObject.target.y;
		var eyez = _this.cameraObject.position.z-_this.cameraObject.target.z;
		var fact = 1.0/Math.sqrt(eyex*eyex+eyey*eyey+eyez*eyez);
		eyex = eyex * fact;
		eyey = eyey * fact;
		eyez = eyez * fact;
		/* look at the centre of the sphere */
		var localTargetPosition = [centreX, centreY, centreZ];
		/* shift the eye position to achieve the desired view_angle */
		var eye_distance = radius/Math.tan(view_angle*Math.PI/360.0);
		var localEyePosition = [ centreX + eyex*eye_distance,  centreY + eyey*eye_distance,
		                    centreZ + eyez*eye_distance];
		var localFarPlane = eye_distance+clip_distance;
		var localNearPlane = 0.0;
		var nearClippingFactor = 0.95;
		if (clip_distance > nearClippingFactor*eye_distance)
		{
			localNearPlane = (1.0 - nearClippingFactor)*eye_distance;
		}
		else
		{
			localNearPlane = eye_distance - clip_distance;
		}
		var newViewport = new Zinc.Viewport();
		newViewport.nearPlane = localNearPlane;
		newViewport.farPlane = localFarPlane;
		newViewport.eyePosition = localEyePosition;
		newViewport.targetPosition = localTargetPosition;
		newViewport.upVector = [_this.cameraObject.up.x, _this.cameraObject.up.y,
		                        _this.cameraObject.up.z];
		
		return newViewport;
	}
	
	this.getDefaultViewport = function() {
		return defaultViewport;
	}
	
	this.getCurrentViewport = function() {
		var currentViewport = new Zinc.Viewport();
		currentViewport.nearPlane = _this.cameraObject.near;
		currentViewport.farPlane = _this.cameraObject.far;
		currentViewport.eyePosition[0] = _this.cameraObject.position.x;
		currentViewport.eyePosition[1] = _this.cameraObject.position.y;
		currentViewport.eyePosition[2] = _this.cameraObject.position.z;
		currentViewport.targetPosition[0] = _this.cameraObject.target.x;
		currentViewport.targetPosition[1] = _this.cameraObject.target.y;
		currentViewport.targetPosition[2] = _this.cameraObject.target.z;
		currentViewport.upVector[0] = _this.cameraObject.up.x;
		currentViewport.upVector[1] = _this.cameraObject.up.y;
		currentViewport.upVector[2] = _this.cameraObject.up.z;
		return currentViewport;
	}
	
	this.getDefaultEyePosition = function() {
		return eyePosition;
	}
	
	this.getDefaultTargetPosition = function() {
		return targetPosition;
	}
	
	this.cameraTransition = function (startingViewport, endingViewport, durationIn) {
		smoothCameraTransitionObject = new Zinc.SmoothCameraTransition(startingViewport, endingViewport,
			_this, durationIn);
	}
	
	this.enableCameraTransition = function () {
		currentMode = MODE.SMOOTH_CAMERA_TRANSITION;
	}
	
	this.pauseCameraTransition = function () {
		currentMode = MODE.DEFAULT;
	}
	
	this.stopCameraTransition = function () {
		currentMode = MODE.DEFAULT;
		smoothCameraTransitionObject = undefined;
	}
	
	this.isTransitioningCamera = function () {
		return (currentMode === MODE.SMOOTH_CAMERA_TRANSITION);
	}
	
	this.autoTumble = function (tumbleDirectionIn, tumbleRateIn, stopOnCameraInputIn) {
		cameraAutoTumbleObject = new Zinc.CameraAutoTumble(tumbleDirectionIn, tumbleRateIn, stopOnCameraInputIn, _this);
	}
	
	this.enableAutoTumble = function () {
		currentMode = MODE.AUTO_TUMBLE;
	}
	
	this.stopAutoTumble = function () {
		currentMode = MODE.DEFAULT;
		cameraAutoTumbleObject = undefined;
	}
	
	this.enableRaycaster = function (sceneIn, callbackFunctionIn, hoverCallbackFunctionIn) {
		if (zincRayCaster == undefined)
			zincRayCaster = new Zinc.RayCaster(sceneIn, callbackFunctionIn, hoverCallbackFunctionIn, _this.renderer);
	}
	
	this.disableRaycaster = function () {
		zincRayCaster.disable();
		zincRayCaster = undefined;
	}
	
	this.updateAutoTumble = function() {
		if (cameraAutoTumbleObject)
			cameraAutoTumbleObject.requireUpdate = true;
	}
	
	this.isAutoTumble = function () {
		return (currentMode === MODE.AUTO_TUMBLE);
	}
	
	this.enable();

};

exports.SmoothCameraTransition = function (startingViewport, endingViewport, targetCameraIn, durationIn) {
	var startingEyePosition = startingViewport.eyePosition;
	var startingTargetPosition = startingViewport.targetPosition;
	var endingEyePosition = endingViewport.eyePosition;
	var endingTargetPosition = endingViewport.targetPosition;
	var targetCamera = targetCameraIn;
	var _this = this;
	var duration = durationIn;
	var inbuildTime = 0;
	var enabled = true;
	var updateLightWithPathFlag = true;
	var completed = false;
	targetCamera.near = Math.min(startingViewport.nearPlane, endingViewport.nearPlane);
	targetCamera.far = Math.max(startingViewport.farPlane, endingViewport.farPlane);
	
	var updateTime = function(delta) {
		var targetTime = inbuildTime + delta;
		if (targetTime > duration)
			targetTime = duration;
		inbuildTime = targetTime;
	}
	
	var updateCameraSettings = function () {
		var ratio = inbuildTime / duration;
		var eyePosition = [startingEyePosition[0] * (1.0 - ratio) + endingEyePosition[0] * ratio,
		                   startingEyePosition[1] * (1.0 - ratio) + endingEyePosition[1] * ratio,
		                   startingEyePosition[2] * (1.0 - ratio) + endingEyePosition[2] * ratio];
		var targetPosition = [startingTargetPosition[0] * (1.0 - ratio) + endingTargetPosition[0] * ratio,
		                      startingTargetPosition[1] * (1.0 - ratio) + endingTargetPosition[1] * ratio,
		                      startingTargetPosition[2] * (1.0 - ratio) + endingTargetPosition[2] * ratio];
		targetCamera.cameraObject.position.set( eyePosition[0], eyePosition[1], eyePosition[2]);
		targetCamera.cameraObject.target.set( targetPosition[0], targetPosition[1], targetPosition[2]  );
	}
	
	this.update = function (delta) {

		if ( _this.enabled === false ) return;
		
		updateTime(delta);
		
		updateCameraSettings();
		
		if (inbuildTime == duration) {
			completed = true;
		}

	}
	
	this.isTransitionCompleted = function () {
		return completed;
	}
	
};

exports.RayCaster = function (sceneIn, callbackFunctionIn, hoverCallbackFunctionIn, rendererIn) {
	var scene = sceneIn;
	var renderer = rendererIn;
	var callbackFunction = callbackFunctionIn;
	var hoverCallbackFunction = hoverCallbackFunctionIn;
	var enabled = true;
	var raycaster = new THREE.Raycaster();
	var mouse = new THREE.Vector2();
	var _this = this;
	
	_this.enable = function() {
		enable = true;
	}

	_this.disable = function() {
		enable = false;
	}
	
	var getIntersectsObject = function(zincCamera, x, y) {
		var rect = zincCamera.domElement.getBoundingClientRect();
		mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
		mouse.y = -((y - rect.top) / rect.height) * 2 + 1;
		var threejsScene = scene.getThreeJSScene();
		renderer.render(threejsScene, zincCamera.cameraObject);
		raycaster.setFromCamera( mouse, zincCamera.cameraObject);
		return raycaster.intersectObjects( threejsScene.children, true );
	}
	
	_this.pick = function(zincCamera, x, y) {
		if (enabled && renderer && scene && zincCamera && callbackFunction) {
			var intersects = getIntersectsObject(zincCamera, x, y);
			callbackFunction(intersects, x, y);
		}
	}
	
	_this.move = function(zincCamera, x, y) {
		if (enabled && renderer && scene && zincCamera && hoverCallbackFunction) {
			var intersects = getIntersectsObject(zincCamera, x, y);
			hoverCallbackFunction(intersects, x, y);
		}
	}
	
};


exports.CameraAutoTumble = function (tumbleDirectionIn, tumbleRateIn, stopOnCameraInputIn, targetCameraIn) {
	var tumbleAxis = new THREE.Vector3();
	var angle = -tumbleRateIn;
	var targetCamera = targetCameraIn;
	var _this = this;
	var enabled = true;
	var updateLightWithPathFlag = true;
	var tumbleDirection = tumbleDirectionIn;
	this.stopOnCameraInput = stopOnCameraInputIn;
	this.requireUpdate = true;
	
	var computeTumbleAxisAngle = function(tumbleDirection) {
		var tangent_dist = Math.sqrt(tumbleDirection[0]*tumbleDirection[0] +
			tumbleDirection[1]*tumbleDirection[1]);
		var width = Math.abs(tumbleDirection[0]) * 4.0;
		var height = Math.abs(tumbleDirection[1]) * 4.0;
		var radius = 0.25 * (width + height);
		var dx = -tumbleDirection[1]/tangent_dist;
		var dy = tumbleDirection[0]/tangent_dist;
		var d = dx*(tumbleDirection[0])+dy*(-tumbleDirection[1]);
		
		if (d > radius)
		{
			d = radius;
		}
		else
		{
			if (d < -radius)
			{
				d = -radius;
			}
		}
		
		var phi=Math.acos(d/radius)-0.5*Math.PI;
		/* get axis to rotate about */
		var a = new THREE.Vector3(targetCamera.cameraObject.position.x - targetCamera.cameraObject.target.x,
		         targetCamera.cameraObject.position.y - targetCamera.cameraObject.target.y,
		         targetCamera.cameraObject.position.z - targetCamera.cameraObject.target.z);
		a.normalize();
		var b = new THREE.Vector3(targetCamera.cameraObject.up.x, targetCamera.cameraObject.up.y,
		         					targetCamera.cameraObject.up.z);
		b.normalize();
		var c = new THREE.Vector3();
		c.crossVectors(b, a);
		c.normalize();
		var e = new THREE.Vector3(dx*c.x + dy*b.x, dx*c.y + dy*b.y, dx*c.z + dy*b.z);
		tumbleAxis.x = Math.sin(phi) * a.x + Math.cos(phi) * e.x;
		tumbleAxis.y = Math.sin(phi) * a.y + Math.cos(phi) * e.y;
		tumbleAxis.z = Math.sin(phi) * a.z + Math.cos(phi) * e.z;
	}
	
	
	
	this.update = function (delta) {

		if ( _this.enabled === false ) return;
		
		if (_this.requireUpdate) {
			computeTumbleAxisAngle(tumbleDirection);
			_this.requireUpdate = false;
		}
		targetCamera.rotateAboutLookAtpoint(tumbleAxis, angle);

	}
	
};


/**
 * @author mrdoob / http://mrdoob.com/
 */
THREE.StereoCameraZoomFixed = function () {

	this.type = 'StereoCamera';

	this.aspect = 1;

	this.cameraL = new THREE.PerspectiveCamera();
	this.cameraL.layers.enable( 1 );
	this.cameraL.matrixAutoUpdate = false;

	this.cameraR = new THREE.PerspectiveCamera();
	this.cameraR.layers.enable( 2 );
	this.cameraR.matrixAutoUpdate = false;

};

Object.assign( THREE.StereoCameraZoomFixed.prototype, {

	update: ( function () {

		var focus, fov, aspect, near, far, zoom;

		var eyeRight = new THREE.Matrix4();
		var eyeLeft = new THREE.Matrix4();

		return function update( camera ) {

			var needsUpdate = focus !== camera.focus || fov !== camera.fov ||
												aspect !== camera.aspect * this.aspect || near !== camera.near ||
												far !== camera.far || zoom !== camera.zoom;

			if ( needsUpdate ) {

				focus = camera.focus;
				fov = camera.fov;
				aspect = camera.aspect * this.aspect;
				near = camera.near;
				far = camera.far;
				zoom = camera.zoom;

				// Off-axis stereoscopic effect based on
				// http://paulbourke.net/stereographics/stereorender/

				var projectionMatrix = camera.projectionMatrix.clone();
				var eyeSep = 0.064 / 2;
				var eyeSepOnProjection = eyeSep * near / focus;
				var ymax = near * Math.tan( THREE.Math.DEG2RAD * fov * 0.5 ) / camera.zoom;
				var xmin, xmax;

				// translate xOffset

				eyeLeft.elements[ 12 ] = - eyeSep;
				eyeRight.elements[ 12 ] = eyeSep;

				// for left eye

				xmin = - ymax * aspect + eyeSepOnProjection;
				xmax = ymax * aspect + eyeSepOnProjection;

				projectionMatrix.elements[ 0 ] = 2 * near / ( xmax - xmin );
				projectionMatrix.elements[ 8 ] = ( xmax + xmin ) / ( xmax - xmin );

				this.cameraL.projectionMatrix.copy( projectionMatrix );

				// for right eye

				xmin = - ymax * aspect - eyeSepOnProjection;
				xmax = ymax * aspect - eyeSepOnProjection;

				projectionMatrix.elements[ 0 ] = 2 * near / ( xmax - xmin );
				projectionMatrix.elements[ 8 ] = ( xmax + xmin ) / ( xmax - xmin );

				this.cameraR.projectionMatrix.copy( projectionMatrix );

			}

			this.cameraL.matrixWorld.copy( camera.matrixWorld ).multiply( eyeLeft );
			this.cameraR.matrixWorld.copy( camera.matrixWorld ).multiply( eyeRight );

		};

	} )()

} );

/** the following StereoEffect is written by third party */
/**
 * @author alteredq / http://alteredqualia.com/
 * @authod mrdoob / http://mrdoob.com/
 * @authod arodic / http://aleksandarrodic.com/
 * @authod fonserbc / http://fonserbc.github.io/
*/
THREE.StereoEffect = function ( renderer ) {

	var _stereo = new StereoCameraZoomFixed();
	_stereo.aspect = 0.5;

	this.setSize = function ( width, height ) {

		renderer.setSize( width, height );

	};

	this.render = function ( scene, camera ) {

		scene.updateMatrixWorld();

		if ( camera.parent === null ) camera.updateMatrixWorld();

		_stereo.update( camera );

		var size = renderer.getSize();

		renderer.setScissorTest( true );
		renderer.clear();

		renderer.setScissor( 0, 0, size.width / 2, size.height );
		renderer.setViewport( 0, 0, size.width / 2, size.height );
		renderer.render( scene, _stereo.cameraL );

		renderer.setScissor( size.width / 2, 0, size.width / 2, size.height );
		renderer.setViewport( size.width / 2, 0, size.width / 2, size.height );
		renderer.render( scene, _stereo.cameraR );

		renderer.setScissorTest( false );

	};

};


/**
 * @author richt / http://richt.me
 * @author WestLangley / http://github.com/WestLangley
 *
 * W3C Device Orientation control (http://w3c.github.io/deviceorientation/spec-source-orientation.html)
 */

ModifiedDeviceOrientationControls = function ( object ) {

	var scope = this;

	this.object = object;
	this.object.rotation.reorder( "YXZ" );

	this.enabled = true;

	this.deviceOrientation = {};
	this.screenOrientation = 0;

	var onDeviceOrientationChangeEvent = function ( event ) {

		scope.deviceOrientation = event;

	};

	var onScreenOrientationChangeEvent = function () {

		scope.screenOrientation = window.orientation || 0;

	};

	// The angles alpha, beta and gamma form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''

	var setObjectQuaternion = function () {

		var zee = new THREE.Vector3( 0, 0, 1 );

		var euler = new THREE.Euler();

		var q0 = new THREE.Quaternion();

		var q1 = new THREE.Quaternion( - Math.sqrt( 0.5 ), 0, 0, Math.sqrt( 0.5 ) ); // - PI/2 around the x-axis

		return function ( cameraObject, alpha, beta, gamma, orient ) {
			
			var vector = new THREE.Vector3(0, 0, 1);
			
			vector.subVectors(cameraObject.target, cameraObject.position);

			euler.set( beta, alpha, - gamma, 'YXZ' );                       // 'ZXY' for the device, but 'YXZ' for us

			var quaternion = new THREE.Quaternion();
			
			quaternion.setFromEuler( euler );                               // orient the device

			quaternion.multiply( q1 );                                      // camera looks out the back of the device, not the top

			quaternion.multiply( q0.setFromAxisAngle( zee, - orient ) );    // adjust for screen orientation
			
			vector.applyQuaternion(quaternion);
				
			vector.addVectors(cameraObject.position, vector);
			
			cameraObject.lookAt(vector);

		}

	}();

	this.connect = function() {

		onScreenOrientationChangeEvent(); // run once on load

		window.addEventListener( 'orientationchange', onScreenOrientationChangeEvent, false );
		window.addEventListener( 'deviceorientation', onDeviceOrientationChangeEvent, false );

		scope.enabled = true;

	};

	this.disconnect = function() {

		window.removeEventListener( 'orientationchange', onScreenOrientationChangeEvent, false );
		window.removeEventListener( 'deviceorientation', onDeviceOrientationChangeEvent, false );

		scope.enabled = false;

	};

	this.update = function () {

		if ( scope.enabled === false ) return;

		var alpha  = scope.deviceOrientation.alpha ? THREE.Math.degToRad( scope.deviceOrientation.alpha ) : 0; // Z
		var beta   = scope.deviceOrientation.beta  ? THREE.Math.degToRad( scope.deviceOrientation.beta  ) : 0; // X'
		var gamma  = scope.deviceOrientation.gamma ? THREE.Math.degToRad( scope.deviceOrientation.gamma ) : 0; // Y''
		var orient = scope.screenOrientation       ? THREE.Math.degToRad( scope.screenOrientation       ) : 0; // O

		setObjectQuaternion( scope.object, alpha, beta, gamma, orient );

	};

	this.dispose = function () {

		this.disconnect();

	};

	this.connect();

};


/***/ }),
/* 8 */
/***/ (function(module, exports) {

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

exports.loadExternalFile = loadExternalFile;
exports.loadExternalFiles = loadExternalFiles;


/***/ })
/******/ ]);
});