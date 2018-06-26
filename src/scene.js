var THREE = require('three');
var JSONLoader = require('./loader').JSONLoader;
var STLLoader = require('./STLLoader').STLLoader;
var OBJLoader = require('./OBJLoader').OBJLoader;

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

		zincCameraControls = new (require('./controls').CameraControls)( _this.camera, rendererIn.domElement, rendererIn, scene );

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
		var viewPort = new (require('./controls').Viewport)();
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
		var newGlyphset = new (require('./glyphset').Glyphset)();
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

        var colour = require('./zinc').defaultMaterialColor;
        var opacity = require('./zinc').defaultOpacity;
        var localTimeEnabled = 0;
        if (timeEnabled != undefined)
        	localTimeEnabled = timeEnabled ? true: false;
        var localMorphColour = 0;
        if (morphColour != undefined)
        	localMorphColour = morphColour ? true: false;
        var loader = new JSONLoader( true );
        if (fileFormat !== undefined) {
        	if (fileFormat == "STL") {
        		loader = new STLLoader( );
        	} else if (fileFormat == "OBJ") {
        		loader = new OBJLoader( );
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
        var colour =  require('./zinc').defaultMaterialColor;
        var opacity =  require('./zinc').defaultOpacity;
		var loader = new STLLoader( );
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
        var colour =  require('./zinc').defaultMaterialColor;
        var opacity =  require('./zinc').defaultOpacity;
		var loader = new OBJLoader( );
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
        	var loader = new JSONLoader( true );
        	var colour =  require('./zinc').defaultMaterialColor;
        	var opacity =  require('./zinc').defaultOpacity;
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
		var newGeometry = new (require('./geometry').Geometry)();
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
	    	if (zincGeometry.morph) {
	    		zincGeometry.morph.name = groupName;
	    		zincGeometry.morph.userData = zincGeometry;
	    	}
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
				stereoEffect = new require('./controls').StereoEffect( rendererIn );
			}
			rendererIn.setSize( container.clientWidth, container.clientHeight );
		}
		else {
			rendererIn.setSize( container.clientWidth, container.clientHeight );
		}
		_this.camera.updateProjectionMatrix();
		stereoEffectFlag = stereoFlag;
	}
	
	this.objectIsInScene = function(zincObject) {
    for ( var i = 0; i < zincGeometries.length; i ++ ) {
      if (zincObject === zincGeometries[i]) {
        return true;
      }
    }
    for ( var i = 0; i < zincGlyphsets.length; i ++ ) {
      if (zincObjects === zincGlyphsets[i]) {
        return true;
      }
    }
    return false;
	}
	
  this.alignObjectToCameraView = function(zincObject) {
    if (_this.objectIsInScene(zincObject)) {
      var center = new THREE.Vector3( );
      var boundingBox = zincObject.getBoundingBox();
      var viewport = _this.getZincCameraControls().getCurrentViewport();
      boundingBox.getCenter(center);
      var target = new THREE.Vector3( viewport.targetPosition[0], 
          viewport.targetPosition[1], viewport.targetPosition[2]);
      var eyePosition = new THREE.Vector3( viewport.eyePosition[0], 
          viewport.eyePosition[1], viewport.eyePosition[2]);
      var upVector = new THREE.Vector3(viewport.upVector[0],
          viewport.upVector[1], viewport.upVector[2]);
      var newVec1 = new THREE.Vector3( );
      var newVec2 = new THREE.Vector3( );
      newVec1.subVectors(target, eyePosition).normalize();
      newVec2.subVectors(target, center).normalize();
      var newVec3 = new THREE.Vector3( );
      newVec3.crossVectors(newVec1, newVec2);
      var angle = newVec1.angleTo(newVec2);
      _this.getZincCameraControls().rotateAboutLookAtpoint(newVec3, angle);
    }
  }
   
  this.setCameraTargetToObject = function(zincObject) {
    if (_this.objectIsInScene(zincObject)) {
      var center = new THREE.Vector3( );
      var boundingBox = zincObject.getBoundingBox();
      var viewport = _this.getZincCameraControls().getCurrentViewport();
      boundingBox.getCenter(center);
      var target = new THREE.Vector3( viewport.targetPosition[0], 
          viewport.targetPosition[1], viewport.targetPosition[2]);
      var eyePosition = new THREE.Vector3( viewport.eyePosition[0], 
          viewport.eyePosition[1], viewport.eyePosition[2]);
      var newVec1 = new THREE.Vector3( );
      var newVec2 = new THREE.Vector3( );
      newVec1.subVectors(eyePosition, target);
      newVec2.addVectors(center, newVec1);
      viewport.eyePosition[0] = newVec2.x;
      viewport.eyePosition[1] = newVec2.y;
      viewport.eyePosition[2] = newVec2.z;
      viewport.targetPosition[0] = center.x;
      viewport.targetPosition[1] = center.y; 
      viewport.targetPosition[2] = center.z; 
      _this.getZincCameraControls().setCurrentCameraSettings(viewport);
    }
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
