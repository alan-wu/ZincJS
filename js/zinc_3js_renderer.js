var Zinc = { REVISION: '4' };

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
		_this.morph.time = time
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
		if (_this.timeEnabled == 1) {
			if (playAnimation == true) 
				_this.morph.updateAnimation( delta );
		}
		if (_this.morphColour == 1) {
			if (typeof _this.geometry !== "undefined") {
				if (playAnimation == true) {
					if (_this.morph.material.vertexColors == THREE.VertexColors)
					{
						console.log("calculated")
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
	
	this.loadModelsURL = function(urls, colours, opacities, timeEnabled, morphColour)
	{
		var number = urls.length;
		var previous_number = num_inputs;
		num_inputs += number
        for (var i = 0; i < number; i++)
        {
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
        	loader.load( filename, meshloader(previous_number + i, colour, opacity, localTimeEnabled, localMorphColour)); 
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
	
	this.loadFromViewURL = function(jsonFilePrefix)
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
		        _this.loadModelsURL(urls, viewData.colour, viewData.opacity, viewData.timeEnabled, viewData.morphColour)
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
	
	meshloader = function(modelId, colour, opacity, localTimeEnabled, localMorphColour) {
	    return function(geometry){
	    	isTransparent = false;
    			if (1.0 > opacity)
    				isTransparent = true;
				var material = new THREE.MeshPhongMaterial( { color: colour, morphTargets: localTimeEnabled, morphNormals: false, vertexColors: THREE.VertexColors, transparent: isTransparent, opacity: opacity });
				material.side = THREE.DoubleSide;
				var meshAnim = undefined;
				if (localTimeEnabled == true) {
					meshAnim = new THREE.MorphAnimMesh( geometry, material );
					geometry.computeMorphNormals(meshAnim);
					meshAnim.duration = _this.duration;
					
				} else {
					meshAnim = new THREE.Mesh( geometry,material)
				}
				
				setPositionOfObject(meshAnim);
				scene.add( meshAnim );
				var newGeometry = new Zinc.Geometry()
				newGeometry.geometry = geometry;
				newGeometry.timeEnabled = localTimeEnabled;
				newGeometry.morphColour = localMorphColour;
				newGeometry.modelId = modelId;
				newGeometry.morph = meshAnim;	
				myGeometry.push ( newGeometry ) ;
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

	this.animate = function() {
		requestAnimationFrame( _this.animate );
		render();
	}

	var prevTime = Date.now();
	
	this.getCurrentTime = function() {
		if (morph[0].time != undefined)
			return morph[0].time;
		else
			return 0.0;
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
		
};

