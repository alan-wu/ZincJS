var THREE = require('three');
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
			var new_scene = new (require('./scene')).Scene(container, renderer)
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
