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
