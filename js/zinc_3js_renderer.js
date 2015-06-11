var Zinc = { REVISION: '1' };

Zinc.Renderer = function (containerIn, window) {

	animation = 0;
	
	container = containerIn;
	
	stats = 0;

	this.camera = undefined, 
	scene = undefined;
	renderer = undefined;

	tumble_rate = 1.5;
	morphs = [];
	myGeometry = [];
	clock = new THREE.Clock();
	directionalLight = 0;
	duration = 3000;
	nearPlane = 10.0353320682268;
	farPlane = 12.6264735624;
	eyePosition = [0.5, 0.5, 4.033206822678309];
	targetPosition = [0.5, 0.5, 0.5];
	upVector = [ 0.0, 1.0, 0.0];
	centroid = [0, 0, 0]
	timeEnabled = false;
	morphColour = [false];
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
        	loader.load( filename, meshloader(i, colour, opacity)); 
        }
	}
	
	this.loadViewURL = function(url)
	{
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = function() {
		    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
		        var viewData = JSON.parse(xmlhttp.responseText);
		        nearPlane = viewData.nearPlane
		        farPlane = viewData.farPlane
		        eyePosition = viewData.eyePosition
		        targetPosition = viewData.targetPosition
		        upVector = viewData.upVector
		        _this.resetView()
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
		        nearPlane = viewData.nearPlane
		        farPlane = viewData.farPlane
		        eyePosition = viewData.eyePosition
		        targetPosition = viewData.targetPosition
		        upVector = viewData.upVector
		        if (viewData.numberOfResources != undefined && viewData.timeEnabled == 1) 
		        	timeEnabled = true
		        _this.resetView()
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
	
	createDataText = function ()
	{
		var text2 = document.getElementById('myText');
		text2.style.position = 'absolute';
		//text2.style.zIndex = 1;    // if you still don't see the label, try uncommenting this
		text2.style.display="none"
		text2.style.width = 100;
		text2.style.height = 50;
		text2.style.backgroundColor = "black";
		text2.innerHTML = "Delta: 0";
		text2.style.top = (container.clientHeight - 100) + 'px';
		text2.style.left = 10 + 'px';		
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
	
	meshloader = function(modelId, colour, opacity) {
	    return function(geometry){
	    	isTransparent = false;
    			if (1.0 > opacity)
    				isTransparent = true;
				var material = new THREE.MeshLambertMaterial( { color: colour, morphTargets: timeEnabled, morphNormals: false, vertexColors: THREE.VertexColors, transparent: isTransparent, opacity: opacity });
				material.side = THREE.DoubleSide;
				var meshAnim = new THREE.MorphAnimMesh( geometry, material );
				if (timeEnabled == true) {
					meshAnim = new THREE.MorphAnimMesh( geometry, material );
					geometry.computeMorphNormals(meshAnim);
					meshAnim.duration = duration;
					morphs.push( meshAnim );
				} else {
					meshAnim = new THREE.Mesh( geometry,material)
				}
			
				setPositionOfObject(meshAnim);
				scene.add( meshAnim );
				
				myGeometry.push ( geometry ) ;
		}
	
	}

	this.initialiseVisualisation = function() {
		_this.camera = new THREE.PerspectiveCamera( 40, container.clientWidth / container.clientHeight, nearPlane , farPlane);
		this.resetView();
		
		//createDataText();
		  
		projector = new THREE.Projector();
		scene = new THREE.Scene();
		var ambient = new THREE.AmbientLight( 0x202020 );
		scene.add( ambient );

		directionalLight = new THREE.DirectionalLight( 0xA0A0A0  );
		directionalLight.position.set( eyePosition[0], eyePosition[1], eyePosition[2] );
		scene.add( directionalLight );			

		renderer = new THREE.WebGLRenderer();
		renderer.setSize( container.clientWidth, container.clientHeight );
		container.appendChild( renderer.domElement );
		renderer.setClearColor( 0xffffff, 1);
		zincCameraControls = new ZincCameraControls( _this.camera, renderer.domElement, renderer, scene )
		zincCameraControls.setDirectionalLight(directionalLight);

	}
	
	this.getColorsRGB = function(colors, index)
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
	this.morphColorsToVertexColors = function( geometry, morph ) {
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
			if (timeEnabled == true) {		
				for ( var i = 0; i < myGeometry.length; i ++ ) {
					if (morphColour[i] == true) {
						if (typeof myGeometry[i] !== "undefined") {
							morphColorsToVertexColors(myGeometry[i], morphs[i])
							myGeometry[i].colorsNeedUpdate = true;
						}
					}
				}
				for ( var i = 0; i < morphs.length; i ++ ) {
					morph = morphs[ i ];
					morph.updateAnimation( 500 * delta );
				}
			}
		}
		renderer.render( scene, _this.camera );
	}
	
};

