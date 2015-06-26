var Zinc = { REVISION: '2' };

Zinc.Renderer = function (containerIn, window) {

	animation = 0;
	
	container = containerIn;
	
	stats = 0;

	this.camera = undefined, 
	scene = undefined;
	renderer = undefined;

	tumble_rate = 1.5;
	morphs = [];
	//myGeometry contains a tuple of the threejs mesh, timeEnabled and morphColour flag
	myGeometry = [];
	clock = new THREE.Clock();
	this.directionalLight = undefined;
	this.ambient = undefined;
	duration = 3000;
	nearPlane = 10.0353320682268;
	farPlane = 12.6264735624;
	eyePosition = [0.5, 0.5, 4.033206822678309];
	targetPosition = [0.5, 0.5, 0.5];
	upVector = [ 0.0, 1.0, 0.0];
	centroid = [0, 0, 0]
	timeEnabled = [];
	morphColour = [];
	defaultColour=0x7F1F1A
	defaultOpacity=1.0
	zincCameraControls = undefined;
	num_inputs = 0;
	
	onWindowResize = function() {
		_this.camera.aspect = container.clientWidth / container.clientHeight;
		_this.camera.updateProjectionMatrix();
		if (renderer != undefined)
			renderer.setSize( container.clientWidth, container.clientHeight );

	}
	
	window.addEventListener( 'resize', onWindowResize, false );
	
	var _this = this
	
	this.resetView = function()
	{
		onWindowResize()
		_this.camera.near = nearPlane;
		_this.camera.far = farPlane;
		_this.camera.position = new THREE.Vector3(eyePosition[0], eyePosition[1], eyePosition[2]);
		_this.camera.target = new THREE.Vector3( targetPosition[0], targetPosition[1], targetPosition[2]  );
		_this.camera.up.set( upVector[0],  upVector[1], upVector[2]);
		_this.camera.aspect = container.clientWidth / container.clientHeight;
		_this.camera.updateProjectionMatrix();
	}
	
	this.loadModelsURL = function(urls, colours, opacities)
	{
		var number = urls.length;
		var previous_number = num_inputs;
		num_inputs += number
        for (var i = 0; i < number; i++)
        {
        	var filename = urls[i]
        	var loader = new THREE.JSONLoader( true );
        	colour = defaultColour
        	opacity = defaultOpacity
        	if (colours != undefined && colours[i] != undefined)
        		colour = colours[i]
        	if (opacities != undefined && opacities[i] != undefined)
        		opacity = opacities[i]
        	localTimeEnabled = 0
        	console.log(timeEnabled.length, num_inputs)
        	if (timeEnabled.length == num_inputs)
        	{
        		
        		localTimeEnabled = timeEnabled[previous_number + i]
        	}
        	localMorphColour = 0
        	if (morphColour.length == num_inputs)
        		localMorphColour = morphColour[previous_number + i]        	
        	loader.load( filename, meshloader(i, colour, opacity, localTimeEnabled, localMorphColour)); 
        }
	}
	
	loadView = function(viewData)
	{
        nearPlane = viewData.nearPlane
        farPlane = viewData.farPlane
        eyePosition = viewData.eyePosition
        targetPosition = viewData.targetPosition
        upVector = viewData.upVector
        
        if (viewData.numberOfResources != undefined && viewData.timeEnabled != undefined)
        {
        	console.log(viewData.timeEnabled)
        	timeEnabled = timeEnabled.concat(viewData.timeEnabled)
        	console.log(timeEnabled)
        }
        if (viewData.morphColour != undefined)
        	morphColour = morphColour.concat(viewData.morphColour)
        
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
		        _this.loadModelsURL(urls, undefined, undefined)
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
				var material = new THREE.MeshLambertMaterial( { color: colour, morphTargets: localTimeEnabled, morphNormals: false, vertexColors: THREE.VertexColors, transparent: isTransparent, opacity: opacity });
				material.side = THREE.DoubleSide;
				var meshAnim = undefined;
				if (localTimeEnabled == true) {
					meshAnim = new THREE.MorphAnimMesh( geometry, material );
					geometry.computeMorphNormals(meshAnim);
					meshAnim.duration = duration;
					
				} else {
					meshAnim = new THREE.Mesh( geometry,material)
				}
				morphs.push( meshAnim );
				
				setPositionOfObject(meshAnim);
				scene.add( meshAnim );
				
				myGeometry.push ( [geometry, localTimeEnabled, localMorphColour] ) ;
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
	
	/* function to make sure each vertex got the right colour at the right time,
		it will linearly interpolate colour between time steps */
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

	this.animate = function() {
		requestAnimationFrame( _this.animate );
		render();
	}

	var prevTime = Date.now();

	render = function() {

		var delta = clock.getDelta();
		zincCameraControls.update()
		/* the following check make sure all models are loaded and synchonised */
		if (myGeometry.length == num_inputs) {
			for ( var i = 0; i < myGeometry.length; i ++ ) {
				/* check if morphColour flag is set */
				if (myGeometry[i][1] == 1) {
					morph = morphs[ i ];
					morph.updateAnimation( 500 * delta );
				}
				if (myGeometry[i][2] == 1) {
					if (typeof myGeometry[i][0] !== "undefined") {
						morphColorsToVertexColors(myGeometry[i][0], morphs[i])
						myGeometry[i][0].colorsNeedUpdate = true;
					}
				}
			}	
		}
		renderer.render( scene, _this.camera );
	}
	
};

