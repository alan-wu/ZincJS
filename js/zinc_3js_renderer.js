var Zinc = { REVISION: '9' };

Zinc.Geometry = function () {
	this.geometry = undefined;
	this.mixer = undefined;
	this.timeEnabled = false;
	this.morphColour = false;
	this.modelId = -1;
	this.morph = undefined;
	this.clipAction = undefined;
	this.duration = 3000;
	inbuildTime = 0;
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
			return duration * ratio;
		} else {
			return inbuildTime;
		}
	}
	
	this.setMorphTime = function(time){
		if (_this.clipAction){
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
	
	morphColorsToVertexColors = function( geometry, morph, clipAction ) {
		if ( morph && geometry.morphColors && geometry.morphColors.length) {
			var current_time = 0.0;
			if (clipAction)
				current_time = clipAction.time/clipAction._clip.duration * (geometry.morphColors.length - 1);
			else
				current_time = inbuildTime/_this.duration * (geometry.morphColors.length - 1);
			var bottom_frame =  Math.floor(current_time)
			var proportion = 1 - (current_time - bottom_frame)
			var top_frame =  Math.ceil(current_time)
			var bottomColorMap = geometry.morphColors[ bottom_frame ];
			var TopColorMap = geometry.morphColors[ top_frame ];
			for ( var i = 0; i < geometry.faces.length; i ++ ) {
				var my_color1 = getColorsRGB(bottomColorMap.colors, geometry.faces[i].a);
				var my_color2 = getColorsRGB(TopColorMap.colors, geometry.faces[i].a);
				var resulting_color = [my_color1[0] * proportion + my_color2[0] * (1 - proportion),
					my_color1[1] * proportion + my_color2[1] * (1 - proportion),
					my_color1[2] * proportion + my_color2[2] * (1 - proportion)]
				geometry.faces[i].vertexColors[0].setRGB(resulting_color[0], resulting_color[1], resulting_color[2])
				my_color1 = getColorsRGB(bottomColorMap.colors, geometry.faces[i].b);
				my_color2 = getColorsRGB(TopColorMap.colors, geometry.faces[i].b);
				resulting_color = [my_color1[0] * proportion + my_color2[0] * (1 - proportion),
					my_color1[1] * proportion + my_color2[1] * (1 - proportion),
					my_color1[2] * proportion + my_color2[2] * (1 - proportion)]
				geometry.faces[i].vertexColors[1].setRGB(resulting_color[0], resulting_color[1], resulting_color[2])
				my_color1 = getColorsRGB(bottomColorMap.colors, geometry.faces[i].c);
				my_color2 = getColorsRGB(TopColorMap.colors, geometry.faces[i].c);
				resulting_color = [my_color1[0] * proportion + my_color2[0] * (1 - proportion),
					my_color1[1] * proportion + my_color2[1] * (1 - proportion),
					my_color1[2] * proportion + my_color2[2] * (1 - proportion)]
				geometry.faces[i].vertexColors[2].setRGB(resulting_color[0], resulting_color[1], resulting_color[2])
			}	
		}
	}
	
	this.render = function(delta, playAnimation) {
		if (playAnimation == true) 
		{
			if (_this.timeEnabled == 1) {		
				_this.mixer.update( delta );
			}
			else {
				
				var targetTime = inbuildTime + delta;
				if (targetTime > _this.duration)
					targetTime = targetTime - _this.duration
				inbuildTime = targetTime;
			}
		}
		if (_this.morphColour == 1) {
			if (typeof _this.geometry !== "undefined") {
				if (playAnimation == true) {
					if (_this.morph.material.vertexColors == THREE.VertexColors)
					{
						morphColorsToVertexColors(_this.geometry, _this.morph, _this.clipAction)
					}
					_this.geometry.colorsNeedUpdate = true;
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
	var scene = new THREE.Scene();
	this.directionalLight = undefined;
	this.ambient = undefined;
	this.camera = undefined;
	duration = 3000;
	var nearPlane = 10.0353320682268;
	var farPlane = 12.6264735624;
	var eyePosition = [0.5, 0.5, 4.033206822678309];
	var targetPosition = [0.5, 0.5, 0.5];
	var upVector = [ 0.0, 1.0, 0.0];
	var centroid = [0, 0, 0];
	var zincCameraControls = undefined;
	var num_inputs = 0;
	var startingId = 1000;
	
	var _this = this;
	
	this.onWindowResize = function() {
		_this.camera.aspect = container.clientWidth / container.clientHeight;
		_this.camera.updateProjectionMatrix();
	}
	
	this.resetView = function()
	{
		_this.onWindowResize()
		_this.camera.near = nearPlane;
		_this.camera.far = farPlane;
		_this.camera.position.set( eyePosition[0], eyePosition[1], eyePosition[2]);
		_this.camera.target = new THREE.Vector3( targetPosition[0], targetPosition[1], targetPosition[2]  );
		_this.camera.up.set( upVector[0],  upVector[1], upVector[2]);
		_this.camera.aspect = container.clientWidth / container.clientHeight;
		_this.camera.updateProjectionMatrix();
		if (zincCameraControls != undefined)
			zincCameraControls.updateDirectionalLight()
	}
	
	setupCamera = function() {
		_this.camera = new THREE.PerspectiveCamera( 40, container.clientWidth / container.clientHeight, nearPlane , farPlane);
		_this.resetView();
		  
		_this.ambient = new THREE.AmbientLight( 0x202020 );
		scene.add( _this.ambient );
	
		_this.directionalLight = new THREE.DirectionalLight( 0x777777  );
		_this.directionalLight.position.set( eyePosition[0], eyePosition[1], eyePosition[2] );
		scene.add( _this.directionalLight );
	
		zincCameraControls = new ZincCameraControls( _this.camera, rendererIn.domElement, rendererIn, scene )
		zincCameraControls.setDirectionalLight(_this.directionalLight);
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
        	loader.load( filename, meshloader(modelId, colour, opacity, localTimeEnabled, localMorphColour, finishCallback)); 
        }
	}
	
	loadView = function(viewData)
	{
        nearPlane = viewData.nearPlane
        farPlane = viewData.farPlane
        eyePosition = viewData.eyePosition
        targetPosition = viewData.targetPosition
        upVector = viewData.upVector
        _this.resetView()
	}
	
	this.loadViewURL = function(url)
	{
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = function() {
		    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
		        var viewData = JSON.parse(xmlhttp.responseText);
		        loadView(viewData);
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
		        loadView(viewData);
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
	
	setPositionOfObject = function(mesh)
	{
		geometry = mesh.geometry;
		geometry.computeBoundingBox();
		
		var centerX = 0.5 * ( geometry.boundingBox.min.x + geometry.boundingBox.max.x );
		var centerY = 0.5 * ( geometry.boundingBox.min.y + geometry.boundingBox.max.y );
		var centerZ = 0.5 * ( geometry.boundingBox.min.z + geometry.boundingBox.max.z );
		centroid = [ centerX, centerY, centerZ]
	}
	
	this.addZincGeometry = function(geometry, modelId, colour, opacity, localTimeEnabled, localMorphColour, external, finishCallback) {
		if (external == undefined)
			external = true	
		if (external)
			num_inputs++;
    	isTransparent = false;
		if (1.0 > opacity)
			isTransparent = true;
		var material = new THREE.MeshPhongMaterial( { color: colour, morphTargets: localTimeEnabled, morphNormals: false, vertexColors: THREE.VertexColors, transparent: isTransparent, opacity: opacity });
		material.side = THREE.DoubleSide;
		var mesh = undefined;
		mesh = new THREE.Mesh( geometry, material );
		geometry.computeMorphNormals();
		
		setPositionOfObject(mesh);
		scene.add( mesh );
		var newGeometry = new Zinc.Geometry();
		var mixer = new THREE.AnimationMixer(mesh);
		var clipAction = undefined;
		if (geometry.animations && geometry.animations[0] != undefined)
		{
			var action = THREE.AnimationClip.CreateFromMorphTargetSequence( 'zinc_animations', geometry.morphTargets, 30 );
			var clipAction = mixer.clipAction( action ).setDuration(duration).play();
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
		if (finishCallback != undefined && (typeof finishCallback == 'function'))
			finishCallback(newGeometry);
		
		return newGeometry;
	}
	
	meshloader = function(modelId, colour, opacity, localTimeEnabled, localMorphColour, finishCallback) {
	    return function(geometry){
	    	_this.addZincGeometry(geometry, modelId, colour, opacity, localTimeEnabled, localMorphColour, false, finishCallback);
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
	
	this.renderGeometries = function(playRate, delta, playAnimation) {
		zincCameraControls.update();
		/* the following check make sure all models are loaded and synchonised */
		if (zincGeometries.length == num_inputs) {		
			for ( var i = 0; i < zincGeometries.length; i ++ ) {
				/* check if morphColour flag is set */
				zincGeometry = zincGeometries[i] ;
				zincGeometry.render(playRate * delta, playAnimation)
			}	
		}
		
	}
	
	this.render = function(renderer) {
		renderer.clear();
		renderer.render( scene, _this.camera );
	}
	
	this.setInteractiveControlEnable = function(flag) {
		if (flag == true)
			zincCameraControls.enable();
		else
			zincCameraControls.disable();
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
	var sceneMap = new Map();
	
	var _this = this;
	
	this.initialiseVisualisation = function() {
		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize( container.clientWidth, container.clientHeight );
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
			if (currentScene)
				currentScene.setInteractiveControlEnable(false);
			currentScene = sceneIn;
			currentScene.setInteractiveControlEnable(true);
		}
	}
	
	this.getSceneByName = function(name) {
		return sceneMap.get(name);
	}
	
	this.createScene = function (name) {
		if (sceneMap.has(name)){
			return undefined;
		} else {
			var new_scene = new Zinc.Scene(container, renderer)
			sceneMap.set(name, new_scene);
			return new_scene;
		}
		
	}
	
	updateOrthoScene = function() {
		if (logoSprite != undefined) {
			var material = logoSprite.material;
			if (material.map)
				logoSprite.position.set( (container.clientWidth- material.map.image.width)/2, 
					(-container.clientHeight + material.map.image.height)/2, 1 );
		}
	}
	
	updateOrthoCamera = function() {
		if (cameraOrtho != undefined) {
			cameraOrtho.left = - container.clientWidth / 2;
			cameraOrtho.right = container.clientWidth / 2;
			cameraOrtho.top =  container.clientHeight / 2;
			cameraOrtho.bottom = -  container.clientHeight / 2;
			cameraOrtho.updateProjectionMatrix();
		}
	}
	
	this.onWindowResize = function() {
		currentScene.onWindowResize();
		if (renderer != undefined)
			renderer.setSize( container.clientWidth, container.clientHeight );
	}
	
	window.addEventListener( 'resize', _this.onWindowResize, false );
	
	this.resetView = function()	{
		currentScene.resetView();
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
		render();
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
	
	createHUDSprites = function(logoSprite) {
		
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
	
	render = function() {
		var delta = clock.getDelta();
		currentScene.renderGeometries(playRate, delta, _this.playAnimation);
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
