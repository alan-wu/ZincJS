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
