var Zinc = { REVISION: '7' };

Zinc.Geometry = function () {
	this.geometry = undefined;
	this.timeEnabled = false;
	this.morphColour = false;
	this.modelId = -1;
	this.morph = undefined;
	var _this = this
	
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
	
	this.setMorphTime = function(time){
		var TargetTime = 0;
		_this.morph.time = time
		if (_this.morph.time > _this.morph.duration)
			_this.morph.time = morph.duration
		if (_this.morph.time < 0.0)
			_this.morph.time = 0.0
		if (_this.timeEnabled == 1)
			_this.morph.updateAnimation( 0.0 );
		if (_this.morphColour == 1) {
			if (typeof _this.geometry !== "undefined") {
				if (_this.morph.material.vertexColors == THREE.VertexColors)
				{
					morphColorsToVertexColors(_this.geometry, _this.morph)
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
	
	morphColorsToVertexColors = function( geometry, morph ) {
		if ( morph && geometry.morphColors && geometry.morphColors.length ) {
			var current_time = morph.time/morph.duration * (geometry.morphColors.length - 1)
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
				_this.morph.updateAnimation( delta );
			}
			else {
				var targetTime = _this.morph.time + delta;
				if (targetTime > _this.morph.duration)
					targetTime = targetTime - _this.morph.duration
				_this.morph.time = targetTime
			}
		}
		if (_this.morphColour == 1) {
			if (typeof _this.geometry !== "undefined") {
				if (playAnimation == true) {
					if (_this.morph.material.vertexColors == THREE.VertexColors)
					{
						morphColorsToVertexColors(_this.geometry, _this.morph)
					}
					_this.geometry.colorsNeedUpdate = true;
				}
			}
		}
	}
	
}


Zinc.Renderer = function (containerIn, window) {

	animation = 0;
	
	container = containerIn;
	
	stats = 0;

	this.camera = undefined, 
	scene = undefined;
	renderer = undefined;

	tumble_rate = 1.5;
	//myGeometry contains a tuple of the threejs mesh, timeEnabled, morphColour flag, unique id and morph
	myGeometry = [];
	clock = new THREE.Clock();
	this.directionalLight = undefined;
	this.ambient = undefined;
	this.duration = 3000;
	nearPlane = 10.0353320682268;
	farPlane = 12.6264735624;
	eyePosition = [0.5, 0.5, 4.033206822678309];
	targetPosition = [0.5, 0.5, 0.5];
	upVector = [ 0.0, 1.0, 0.0];
	centroid = [0, 0, 0]
	this.defaultColour=0x7F1F1A
	defaultOpacity=1.0
	zincCameraControls = undefined;
	num_inputs = 0;
	this.playAnimation = true
	/* default animation update rate, rate is 500 and duration is default to 3000, 6s to finish a full animation */
	this.playRate = 500
	startingId = 1000
	preRenderCallbackFunctions = {};
	preRenderCallbackFunctions_id = 0;
	var animated_id = undefined;
	
	var _this = this
	
	this.onWindowResize = function() {
		_this.camera.aspect = container.clientWidth / container.clientHeight;
		_this.camera.updateProjectionMatrix();
		if (renderer != undefined)
			renderer.setSize( container.clientWidth, container.clientHeight );

	}
	
	window.addEventListener( 'resize', _this.onWindowResize, false );
	
	this.resetView = function()
	{
		_this.onWindowResize()
		_this.camera.near = nearPlane;
		_this.camera.far = farPlane;
		_this.camera.position = new THREE.Vector3(eyePosition[0], eyePosition[1], eyePosition[2]);
		_this.camera.target = new THREE.Vector3( targetPosition[0], targetPosition[1], targetPosition[2]  );
		_this.camera.up.set( upVector[0],  upVector[1], upVector[2]);
		_this.camera.aspect = container.clientWidth / container.clientHeight;
		_this.camera.updateProjectionMatrix();
		if (zincCameraControls != undefined)
			zincCameraControls.updateDirectionalLight()
	}
	
	nextAvailableInternalZincModelId = function() {
		var idFound = true;
		while (idFound == true) {
			startingId++;
			idFound = false
			for ( var i = 0; i < myGeometry.length; i ++ ) {
				if (myGeometry[i].modelId == startingId)
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
		num_inputs += number
        for (var i = 0; i < number; i++)
        {
        	var modelId = nextAvailableInternalZincModelId();
        	var filename = urls[i]
        	var loader = new THREE.JSONLoader( true );
        	var colour = _this.defaultColour
        	var opacity = defaultOpacity
        	if (colours != undefined && colours[i] != undefined)
        		colour = colours[i]
        	if (opacities != undefined && opacities[i] != undefined)
        		opacity = opacities[i]
        	var localTimeEnabled = 0
        	if (timeEnabled != undefined && timeEnabled[i] != undefined)
        		localTimeEnabled = timeEnabled[i]
        	var localMorphColour = 0
        	if (morphColour != undefined && morphColour[i] != undefined)
        		localMorphColour = morphColour[i]        	
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
		        var urls = []
		        var filename_prefix = jsonFilePrefix + "_"
		        for (var i = 0; i < viewData.numberOfResources; i++)
		        {
		        	var filename = filename_prefix + (i + 1) + ".json"
		        	urls.push(filename)
		        }
		        _this.loadModelsURL(urls, viewData.colour, viewData.opacity, viewData.timeEnabled, viewData.morphColour, finishCallback)
		    }
		}
		requestURL = jsonFilePrefix + "_view.json"
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
		var meshAnim = undefined;
		meshAnim = new THREE.MorphAnimMesh( geometry, material );
		geometry.computeMorphNormals(meshAnim);
		meshAnim.duration = _this.duration;
		/*if (localTimeEnabled == true) {
			meshAnim = new THREE.MorphAnimMesh( geometry, material );
			geometry.computeMorphNormals(meshAnim);
			meshAnim.duration = _this.duration;
			
		} else {
			meshAnim = new THREE.Mesh( geometry,material)
		}*/
		
		setPositionOfObject(meshAnim);
		scene.add( meshAnim );
		var newGeometry = new Zinc.Geometry()
		newGeometry.geometry = geometry;
		newGeometry.timeEnabled = localTimeEnabled;
		newGeometry.morphColour = localMorphColour;
		newGeometry.modelId = modelId;
		newGeometry.morph = meshAnim;	
		myGeometry.push ( newGeometry ) ;
		if (finishCallback != undefined && (typeof finishCallback == 'function'))
			finishCallback(newGeometry);
		
		return newGeometry;
	}
	
	meshloader = function(modelId, colour, opacity, localTimeEnabled, localMorphColour, finishCallback) {
	    return function(geometry){
	    	_this.addZincGeometry(geometry, modelId, colour, opacity, localTimeEnabled, localMorphColour, false, finishCallback)
		}
	}

	this.initialiseVisualisation = function() {
		_this.camera = new THREE.PerspectiveCamera( 40, container.clientWidth / container.clientHeight, nearPlane , farPlane);
		this.resetView();
		
		//createDataText();
		  
		projector = new THREE.Projector();
		scene = new THREE.Scene();
		_this.ambient = new THREE.AmbientLight( 0x202020 );
		scene.add( _this.ambient );

		_this.directionalLight = new THREE.DirectionalLight( 0x777777  );
		_this.directionalLight.position.set( eyePosition[0], eyePosition[1], eyePosition[2] );
		scene.add( _this.directionalLight );

		renderer = new THREE.WebGLRenderer();
		renderer.setSize( container.clientWidth, container.clientHeight );
		container.appendChild( renderer.domElement );
		renderer.setClearColor( 0xffffff, 1);
		zincCameraControls = new ZincCameraControls( _this.camera, renderer.domElement, renderer, scene )
		zincCameraControls.setDirectionalLight(_this.directionalLight);

	}
	
	this.updateDirectionalLight = function()
	{
		zincCameraControls.updateDirectionalLight();
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
	
	this.getCurrentTime = function() {
		if (morph[0].time != undefined)
			return morph[0].time;
		else
			return 0.0;
	}
	
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

	render = function() {
		var delta = clock.getDelta();
		zincCameraControls.update()
		/* the following check make sure all models are loaded and synchonised */
		if (myGeometry.length == num_inputs) {		
			for ( var i = 0; i < myGeometry.length; i ++ ) {
				/* check if morphColour flag is set */
				zincGeometry = myGeometry[i] 
				zincGeometry.render(_this.playRate * delta, _this.playAnimation)
			}	
		}
    	for (key in preRenderCallbackFunctions) {
        	if (preRenderCallbackFunctions.hasOwnProperty(key)) {
        		preRenderCallbackFunctions[key].call();
        	}
    	}
		renderer.render( scene, _this.camera );
	}
	
	this.getCurrentTime = function() {
		var currentTime = 0;
		if (myGeometry[0] != undefined)
		{
			morph = myGeometry[0].morph
			currentTime = morph.time/morph.duration;
		}
		return currentTime;
	}
	
	this.setMorphsTime = function(time) {
		for ( var i = 0; i < myGeometry.length; i ++ ) {
			zincGeometry = myGeometry[i]
			zincGeometry.setMorphTime(time)
		}
	}
	
	this.getZincGeometryByID = function(id) {
		for ( var i = 0; i < myGeometry.length; i ++ ) {
			if (myGeometry[i].modelId == id)
			{
				return myGeometry[i];
			}
		}
		
		return null;
	}
	
	this.addToScene = function(object) {
		scene.add(object)
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


