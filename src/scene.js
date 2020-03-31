const THREE = require('three');
const SceneLoader =require('./sceneLoader').SceneLoader;

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
exports.Scene = function(containerIn, rendererIn) {
  const container = containerIn;
  let zincGeometries = [];
  let zincGlyphsets = [];
  let zincPointsets = [];
  let zincLines = [];
  let videoHandler = undefined;
  let sceneLoader = new SceneLoader(this);
  const scene = new THREE.Scene();
  /**
   * A {@link THREE.DirectionalLight} object for controlling lighting of this scene.
   */
  this.directionalLight = undefined;
  /**
   * a {@link THREE.AmbientLight} for controlling the ambient lighting of this scene.
   */
  this.ambient = undefined;
  this.camera = undefined;
  let duration = 3000;
  let zincCameraControls = undefined;
  this.sceneName = undefined;
  let stereoEffectFlag = false;
  let stereoEffect = undefined;
  this.autoClearFlag = true;

  const getDrawingWidth = () => {
	  if (container)
		  if (typeof container.clientWidth !== "undefined")
			  return container.clientWidth;
		  else
			  return container.width;
	  return 0;
  }
  
  const getDrawingHeight = () => {
	  if (container)
		  if (typeof container.clientHeight !== "undefined")
			  return container.clientHeight;
		  else
			  return container.height;
	  return 0;
  }

  /**
   * This function returns a three component array, which contains
   * [totalsize, totalLoaded and errorDownload] of all the downloads happening
   * in this scene.
   * @returns {Array} 
   */
  this.getDownloadProgress = () => {
    return sceneLoader.getDownloadProgress();
  }

  //called from Renderer when panel has been resized
  this.onWindowResize = () => {
    zincCameraControls.onResize();
    this.camera.aspect = getDrawingWidth() / getDrawingHeight();
    this.camera.updateProjectionMatrix();
  }

  /**
   * Reset the viewport of this scene to its original state. 
   */
  this.resetView = () => {
    this.onWindowResize();
    zincCameraControls.resetView();
  }

  //Setup the camera for this scene, it also initialise the lighting
  const setupCamera = () => {
    this.camera = new THREE.PerspectiveCamera(40, getDrawingWidth() / getDrawingHeight(), 0.0, 10.0);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(this.ambient);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    scene.add(this.directionalLight);
    zincCameraControls = new (require('./controls').CameraControls)(this.camera, rendererIn.domElement, rendererIn, scene);

    zincCameraControls.setDirectionalLight(this.directionalLight);
    zincCameraControls.resetView();
  };

  setupCamera();

  /**
   * Load the viewport Data from the argument  {@link Zinc.Viewport} and set it as 
   * the default viewport of this scene.
   * 
   * @param {Zinc.Viewport} viewData - Viewport data to be loaded. 
   */
  this.loadView = ({nearPlane, farPlane, eyePosition, targetPosition, upVector}) => {
    const viewPort = new (require('./controls').Viewport)();
    viewPort.nearPlane = nearPlane;
    viewPort.farPlane = farPlane;
    viewPort.eyePosition = eyePosition;
    viewPort.targetPosition = targetPosition;
    viewPort.upVector = upVector;
    zincCameraControls.setDefaultCameraSettings(viewPort);
    zincCameraControls.resetView();
  }

  /**
   * Get the bounding box of all the object in this scene only.
   * 
   * @returns {THREE.Box3} 
   */
  this.getBoundingBox = () => {
    let boundingBox1 = undefined, boundingBox2 = undefined;
    for (let i = 0; i < zincGeometries.length; i++) {
      boundingBox2 = zincGeometries[i].getBoundingBox();
      if (boundingBox1 == undefined) {
        boundingBox1 = boundingBox2;
      } else {
        boundingBox1.union(boundingBox2);
      }
    }
    for (let i = 0; i < zincGlyphsets.length; i++) {
      boundingBox2 = zincGlyphsets[i].getBoundingBox();
      if (boundingBox1 == undefined) {
        boundingBox1 = boundingBox2;
      } else {
        boundingBox1.union(boundingBox2);
      }
    }
    for (let i = 0; i < zincPointsets.length; i++) {
        boundingBox2 = zincPointsets[i].getBoundingBox();
        if (boundingBox1 == undefined) {
          boundingBox1 = boundingBox2;
        } else {
          boundingBox1.union(boundingBox2);
        }
      }
      for (let i = 0; i < zincLines.length; i++) {
        boundingBox2 = zincLines[i].getBoundingBox();
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
  this.viewAllWithBoundingBox = boundingBox => {
    if (boundingBox) {
      // enlarge radius to keep image within edge of window
      const radius = boundingBox.min.distanceTo(boundingBox.max) / 2.0;
      const centreX = (boundingBox.min.x + boundingBox.max.x) / 2.0;
      const centreY = (boundingBox.min.y + boundingBox.max.y) / 2.0;
      const centreZ = (boundingBox.min.z + boundingBox.max.z) / 2.0;
      const clip_factor = 4.0;
      const viewport = zincCameraControls.getViewportFromCentreAndRadius(centreX, centreY, centreZ, radius, 40, radius * clip_factor);

      zincCameraControls.setCurrentCameraSettings(viewport);
    }
  }

  /**
   * Adjust zoom distance to include all primitives in scene only.
   */
  this.viewAll = () => {
    const boundingBox = this.getBoundingBox();
    this.viewAllWithBoundingBox(boundingBox);
  }

  /**
   * A function which iterates through the list of geometries and call the callback
   * function with the geometries as the argument.
   * @param {Function} callbackFunction - Callback function with the geometry
   * as an argument.
   */
  this.forEachGeometry = callbackFunction => {
    for (let i = zincGeometries.length - 1; i >= 0; i--) {
      callbackFunction(zincGeometries[i]);
    }
  }

  /**
   * A function which iterates through the list of glyphsets and call the callback
   * function with the glyphset as the argument.
   * @param {Function} callbackFunction - Callback function with the glyphset
   * as an argument.
   */
  this.forEachGlyphset = callbackFunction => {
    for (let i = zincGlyphsets.length - 1; i >= 0; i--) {
      callbackFunction(zincGlyphsets[i]);
    }
  }

  /**
   * A function which iterates through the list of pointsets and call the callback
   * function with the pointset as the argument.
   * @param {Function} callbackFunction - Callback function with the pointset
   * as an argument.
   */
  this.forEachPointset = callbackFunction => {
    for (let i = zincPointsets.length - 1; i >= 0; i--) {
      callbackFunction(zincPointsets[i]);
    }
  }

   /**
   * A function which iterates through the list of lines and call the callback
   * function with the lines as the argument.
   * @param {Function} callbackFunction - Callback function with the lines
   * as an argument.
   */
  this.forEachLine = callbackFunction => {
    for (let i = zincLines.length - 1; i >= 0; i--) {
      callbackFunction(zincLines[i]);
    }
  }
  
  /** 
   * Find and return all geometries in this scene with the matching GroupName.
   * 
   * @param {String} GroupName - Groupname to match with.
   * @returns {Array}
   */
  this.findGeometriesWithGroupName = GroupName => {
    const geometriesArray = [];
    for (let i = 0; i < zincGeometries.length; i++) {
      if (zincGeometries[i].groupName == GroupName) {
        geometriesArray.push(zincGeometries[i]);
      }
    }
    return geometriesArray;
  }
  
  /** 
   * Find and return all pointsets in this scene with the matching GroupName.
   * 
   * @param {String} GroupName - Groupname to match with.
   * @returns {Array}
   */
  this.findPointsetsWithGroupName = GroupName => {
    const pointsetsArray = [];
    for (let i = 0; i < zincPointsets.length; i++) {
      if (zincPointsets[i].groupName == GroupName) {
    	  pointsetsArray.push(zincPointsets[i]);
      }
    }
    return pointsetsArray;
  }
  /** 
   * Find and return all glyphsets in this scene with the matching GroupName.
   * 
   * @param {String} GroupName - Groupname to match with.
   * @returns {Array}
   */
  this.findGlyphsetsWithGroupName = GroupName => {
    const glyphsetsArray = [];
    for (let i = 0; i < zincGlyphsets.length; i++) {
      if (zincGlyphsets[i].groupName == GroupName) {
        glyphsetsArray.push(zincGlyphsets[i]);
      }
    }
    return glyphsetsArray;
  }
  
  /** 
   * Find and return all lines in this scene with the matching GroupName.
   * 
   * @param {String} GroupName - Groupname to match with.
   * @returns {Array}
   */
  this.findLinesWithGroupName = GroupName => {
    const linesArray = [];
    for (let i = 0; i < zincLines.length; i++) {
      if (zincLines[i].groupName == GroupName) {
    	  linesArray.push(zincLines[i]);
      }
    }
    return linesArray;
  }

  this.findObjectsWithGroupName = GroupName => {
    let objectsArray = this.findGeometriesWithGroupName(GroupName);
    objectsArray = objectsArray.concat(this.findPointsetsWithGroupName(GroupName));
    objectsArray = objectsArray.concat(this.findGlyphsetsWithGroupName(GroupName));
    objectsArray = objectsArray.concat(this.findLinesWithGroupName(GroupName));
    return objectsArray;
  }

  this.addGlyphset = glyphset => {
	  if (glyphset && glyphset.isGlyphset) {
		  const group = glyphset.getGroup();
		  scene.add(group);
		  zincGlyphsets.push(glyphset) ;
	  }  
  }

  this.addLines = lines => {
    if (lines && lines.isLines) {
      scene.add(lines.morph);
      zincLines.push(lines);
    }
  }

  this.addPointset = pointset => {
    if (pointset && pointset.isPointset) {
      scene.add(pointset.morph);
      zincPointsets.push(pointset);
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
  this.loadGlyphsetURL = (metaurl, glyphurl, groupName, finishCallback) => {
    sceneLoader.loadGlyphsetURL(metaurl, glyphurl, groupName, finishCallback);
  }

  /**
   * Load a pointset into this scene object.
   * 
   * @param {String} metaurl - Provide informations such as transformations, colours 
   * and others for each of the glyph in the glyphsset.
   * @param {Boolean} timeEnabled - Indicate if  morphing is enabled.
   * @param {Boolean} morphColour - Indicate if color morphing is enabled.
   * @param {STRING} groupName - name to assign the pointset's groupname to.
   * @param {Function} finishCallback - Callback function which will be called
   * once the glyphset is succssfully load in.
   */
  this.loadPointsetURL = (url, timeEnabled, morphColour, groupName, finishCallback) => {
    sceneLoader.loadPointsetURL(url, timeEnabled, morphColour, groupName, finishCallback);
  }

    /**
   * Load lines into this scene object.
   * 
   * @param {String} metaurl - Provide informations such as transformations, colours 
   * and others for each of the glyph in the glyphsset.
   * @param {Boolean} timeEnabled - Indicate if  morphing is enabled.
   * @param {Boolean} morphColour - Indicate if color morphing is enabled.
   * @param {STRING} groupName - name to assign the pointset's groupname to.
   * @param {Function} finishCallback - Callback function which will be called
   * once the glyphset is succssfully load in.
   */
  this.loadLinesURL = (url, timeEnabled, morphColour, groupName, finishCallback) => {
    sceneLoader.loadPointsetURL(url, timeEnabled, morphColour, groupName, finishCallback);
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
  this.loadSTL = (url, groupName, finishCallback) => {
    sceneLoader.loadSTL(url, groupName, finishCallback);
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
  this.loadOBJ = (url, groupName, finishCallback) => {
    sceneLoader.loadOBJ(url, groupName, finishCallback);
  }

  /**
   * Load a metadata file from the provided URL into this scene. Once
   * succssful scene proceeds to read each items into scene for visualisations.
   * 
   * @param {String} url - Location of the metafile
   * @param {Function} finishCallback - Callback function which will be called
   * for each glyphset and geometry that has been written in.
   */
  this.loadMetadataURL = (url, finishCallback, allCompletedCallback) => {
    sceneLoader.loadMetadataURL(url, finishCallback, allCompletedCallback);
  }

  /**
   * Load a legacy model(s) format with the provided URLs and parameters. This only loads the geometry
   * without any of the metadata. Therefore, extra parameters should be provided.
   * 
   * @deprecated
   */
  this.loadModelsURL = (urls, colours, opacities, timeEnabled, morphColour, finishCallback) => {
    sceneLoader.loadModelsURL(urls, colours, opacities, timeEnabled, morphColour, finishCallback);
  }

  /**
   * Load the viewport from an external location provided by the url.
   * @param {String} URL - address to the file containing viewport information.
   */
  this.loadViewURL = url => {
    sceneLoader.loadViewURL(url);
  }

  /**
   * Load a legacy file format containing the viewport and its meta file from an external 
   * location provided by the url. Use the new metadata format with
   * {@link Zinc.Scene#loadMetadataURL} instead.
   * 
   * @param {String} URL - address to the file containing viewport and model information.
   * @deprecated
   */
  this.loadFromViewURL = (jsonFilePrefix, finishCallback) => {
    sceneLoader.loadFromViewURL(jsonFilePrefix, finishCallback);
  }

  this.addGeometry = zincGeometry => {
    if (zincGeometry && zincGeometry.morph) {
      if (zincGeometry.modelId === -1) {
        sceneLoader.num_inputs++;
        zincGeometry.modelId = sceneLoader.nextAvailableInternalZincModelId();
      }
      scene.add(zincGeometry.morph);
      zincGeometries.push(zincGeometry) ;
    }
  }

  //Internal function for creating a Zinc.Geometry object and add it into the scene for rendering.
  const addMeshToZincGeometry = (mesh, modelId, localTimeEnabled, localMorphColour) => {
    const newGeometry = new (require('./geometry').Geometry)();
    newGeometry.setMesh(mesh, modelId, localTimeEnabled, localMorphColour);
    return newGeometry;
  };

  
  
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
  this.addZincGeometry = (
    geometryIn,
    modelId,
    colour,
    opacity,
    localTimeEnabled,
    localMorphColour,
    external,
    finishCallback,
    materialIn,
    groupName
  ) => {
    let options = {};
    options.modelId = modelId;
    options.colour = colour;
    options.opacity = opacity;
    options.localTimeEnabled = localTimeEnabled;
    options.localMorphColour = localMorphColour
    const newGeometry = new (require('./geometry').Geometry)();
    newGeometry.createMesh(geometryIn, materialIn, options);
    if (newGeometry.morph) {
      newGeometry.setName(groupName);
      this.addGeometry(newGeometry);
      if (external == undefined)
        external = true
      if (external)
        sceneLoader.num_inputs++;
      if (finishCallback != undefined && (typeof finishCallback == 'function'))
        finishCallback(newGeometry);
      if (!videoHandler && newGeometry.videoHandler)
        videoHandler = newGeometry.videoHandler;
      return newGeometry;
    }
    return undefined;
  }

  //Update the directional light for this scene.
  this.updateDirectionalLight = () => {
    zincCameraControls.updateDirectionalLight();
  }

  /**
   * Add any {THREE.Object} into this scene.
   * @param {THREE.Object} object - to be addded into this scene.
   */
  this.addObject = object => {
    scene.add(object);
  }

  /**
   * Remove any {THREE.Object} from this scene.
   * @param {THREE.Object} object - to be removed from this scene.
   */
  this.removeObject = object => {
    scene.remove(object);
  }

  /**
   * Get the current time of the scene.
   * @return {Number}
   */
  this.getCurrentTime = () => {
    if (videoHandler != undefined) {
      return videoHandler.getCurrentTime(duration);
    }
    if (zincGeometries[0] != undefined) {
      return zincGeometries[0].getCurrentTime();
    }
    if (zincPointsets[0] != undefined) {
        return zincPointsets[0].getCurrentTime();
    }
    if (zincGlyphsets[0] != undefined) {
        return zincGlyphsets[0].getCurrentTime();
    }
    if (zincLines[0] != undefined) {
      return zincLines[0].getCurrentTime();
  }
    return 0;
  }

  /**
   * Set the current time of all the geometries and glyphsets of this scene.
   * @param {Number} time  - Value to set the time to.
   */
  this.setMorphsTime = time => {
    if (videoHandler != undefined) {
      videoHandler.setMorphTime(time, duration);
    }
    for (let i = 0; i < zincGeometries.length; i++) {
      zincGeometry = zincGeometries[i];
      zincGeometry.setMorphTime(time);
    }
    for (let i = 0; i < zincGlyphsets.length; i++) {
      zincGlyphset = zincGlyphsets[i];
      zincGlyphset.setMorphTime(time);
    }
    for (let i = 0; i < zincPointsets.length; i++) {
    	zincPointset = zincPointsets[i];
    	zincPointset.setMorphTime(time);
      }
    for (let i = 0; i < zincLines.length; i++) {
        zincLine = zincLines[i];
        zincLine.setMorphTime(time);
    }
  }

  /**
   * Check if any object in this scene is time varying.
   * 
   * @return {Boolean}
   */
  this.isTimeVarying = () => {
    for (let i = 0; i < zincGeometries.length; i++) {
      if (zincGeometries[i].isTimeVarying()) {
        return true;
      }
    }
    for (let i = 0; i < zincGlyphsets.length; i++) {
      if (zincGlyphsets[i].isTimeVarying()) {
        return true;
      }
    }
    for (let i = 0; i < zincPointsets.length; i++) {
        if (zincPointsets[i].isTimeVarying()) {
          return true;
        }
    }
    for (let i = 0; i < zincLines.length; i++) {
      if (zincLines[i].isTimeVarying()) {
        return true;
      }
    } 
    if (videoHandler && videoHandler.video && !videoHandler.video.error) {
    	return true;
    }
    return false;
  }

  /**
   * Get {Zinc.Geoemtry} in this scene by its id.
   * @return {Zinc.Geometry}
   */
  this.getZincGeometryByID = id => {
    for (let i = 0; i < zincGeometries.length; i++) {
      if (zincGeometries[i].modelId == id) {
        return zincGeometries[i];
      }
    }

    return null;
  }

  // Used to check if all glyphsets are ready.
  const allGlyphsetsReady = () => {
    for (let i = 0; i < zincGlyphsets.length; i++) {
      zincGlyphset = zincGlyphsets[i];
      if (zincGlyphset.ready == false)
        return false;
    }
    return true;
  };

  /**
   * Update geometries and glyphsets based on the calculated time.
   * @private
   */
  this.renderGeometries = (playRate, delta, playAnimation) => {
	  // Let video dictates the progress if one is present
	  if (videoHandler) {
		  if (videoHandler.isReadyToPlay()) {
			  if (playAnimation) {
				  videoHandler.video.play();
			  } else {
				  videoHandler.video.pause();
			  }
			  var currentTime = videoHandler.video.currentTime / videoHandler.getVideoDuration() * 3000;
			  var totalInput = zincGeometries.length + zincPointsets.length;
			  if (totalInput == sceneLoader.num_inputs && allGlyphsetsReady()) {
				  zincCameraControls.setTime(currentTime);
				  zincCameraControls.update(0);
				  for (let i = 0; i < zincGeometries.length; i++) {
					  /* check if morphColour flag is set */
					  zincGeometries[i].setMorphTime(currentTime);
					  zincGeometries[i].render(0, playAnimation);
				  }
				  for (let i = 0; i < zincGlyphsets.length; i++) {
					  zincGlyphsets[i].setMorphTime(currentTime);
					  zincGlyphsets[i].render(0, playAnimation);
				  }
				  for (let i = 0; i < zincPointsets.length; i++) {
					  zincPointsets[i].setMorphTime(currentTime);
					  zincPointsets[i].render(0, playAnimation);
          }
          for (let i = 0; i < zincLines.length; i++) {
					  zincLines[i].setMorphTime(currentTime);
					  zincLines[i].render(0, playAnimation);
				  }
			  } else {
				  zincCameraControls.update(0);
			  }
			  //console.log(videoHandler.video.currentTime / videoHandler.getVideoDuration() * 3000);
		  } else {
			  myPlayRate = 0;
		  }
	  } else {
		  var totalInput = zincGeometries.length + zincPointsets.length + zincLines.length;
		  if (totalInput == sceneLoader.num_inputs && allGlyphsetsReady()) {
			  zincCameraControls.update(delta);
			  for (let i = 0; i < zincGeometries.length; i++) {
				  /* check if morphColour flag is set */
				  zincGeometries[i].render(playRate * delta, playAnimation);;
			  }
			  for (let i = 0; i < zincGlyphsets.length; i++) {
				  zincGlyphsets[i].render(playRate * delta, playAnimation);
			  }
			  for (let i = 0; i < zincPointsets.length; i++) {
				  zincPointsets[i].render(playRate * delta, playAnimation);
        }
        for (let i = 0; i < zincLines.length; i++) {
          zincLines[i].render(playRate * delta, playAnimation);
        }
		  } else {
			  zincCameraControls.update(0);
		  }
	  }
  }

  /**
   * Return the internal {THREE.Scene}.
   * @return {THREE.Scene}
   */
  this.getThreeJSScene = () => {
    return scene;
  }

  /**
   * Set a group of scenes into this parent scene. This group of
   * scenes will also be rendered when this scene is rendered.
   * @private
   */
  this.setAdditionalScenesGroup = scenesGroup => {
    scene.add(scenesGroup);
  }

  /**
   * Render the scene.
   * @private
   */
  this.render = renderer => {
    if (this.autoClearFlag)
      renderer.clear();
    if (stereoEffectFlag && stereoEffect) {
      stereoEffect.render(scene, this.camera);
    }
    else
      renderer.render(scene, this.camera);
  }

  /**
   * Enable or disable interactive control, this is on by default.
   * 
   * @param {Boolean} flag - Indicate either interactive control 
   * should be enabled or disabled.
   */
  this.setInteractiveControlEnable = flag => {
    if (flag == true)
      zincCameraControls.enable();
    else
      zincCameraControls.disable();
  }

  /**
   * Get the camera control of this scene.
   * @return {Zinc.CameraControls}
   */
  this.getZincCameraControls = () => {
    return zincCameraControls;
  }

  /**
   * Get the internal {THREE.Scene}.
   * @return {THREE.Scene}
   */
  this.getThreeJSScene = () => {
    return scene;
  }

  /**
   * Set the default duration value for geometries and glyphsets that are to be loaded
   * into this scene.
   * @param {Number} durationIn - duration of the scene.
   */
  this.setDuration = durationIn => {
    duration = durationIn;
  }

  /**
   * Get the default duration value.
   * returns {Number}
   */
  this.getDuration = () => {
    return duration;
  }

  /**
   * Enable or disable stereo effect of this scene.
   * @param {Boolean} flag - Indicate either stereo effect control 
   * should be enabled or disabled.
   */
  this.setStereoEffectEnable = stereoFlag => {
    if (stereoFlag == true) {
      if (!stereoEffect) {
        stereoEffect = new require('./controls').StereoEffect(rendererIn);
      }
    }
    rendererIn.setSize(getDrawingWidth(), getDrawingHeight());
    this.camera.updateProjectionMatrix();
    stereoEffectFlag = stereoFlag;
  }

  this.objectIsInScene = zincObject => {
    for (let i = 0; i < zincGeometries.length; i++) {
      if (zincObject === zincGeometries[i]) {
        return true;
      }
    }
    for (let i = 0; i < zincGlyphsets.length; i++) {
      if (zincObjects === zincGlyphsets[i]) {
        return true;
      }
    }
    for (let i = 0; i < zincPointsets.length; i++) {
      if (zincObject === zincPointsets[i]) {
        return true;
      }
    }
    for (let i = 0; i < zincLines.length; i++) {
      if (zincObjects === zincLines[i]) {
        return true;
      }
    }
    return false;
  }

  this.alignObjectToCameraView = (zincObject, transitionTime) => {
    if (this.objectIsInScene(zincObject)) {
      const center = new THREE.Vector3();
      const boundingBox = zincObject.getBoundingBox();
      const viewport = this.getZincCameraControls().getCurrentViewport();
      boundingBox.getCenter(center);
      const target = new THREE.Vector3(viewport.targetPosition[0],
        viewport.targetPosition[1], viewport.targetPosition[2]);
      const eyePosition = new THREE.Vector3(viewport.eyePosition[0],
        viewport.eyePosition[1], viewport.eyePosition[2]);
      const upVector = new THREE.Vector3(viewport.upVector[0],
        viewport.upVector[1], viewport.upVector[2]);
      const newVec1 = new THREE.Vector3();
      const newVec2 = new THREE.Vector3();
      newVec1.subVectors(target, eyePosition).normalize();
      newVec2.subVectors(target, center).normalize();
      const newVec3 = new THREE.Vector3();
      newVec3.crossVectors(newVec1, newVec2);
      const angle = newVec1.angleTo(newVec2);
      if (transitionTime > 0) {
        this.getZincCameraControls().rotateCameraTransition(newVec3,
          angle, transitionTime);
        this.getZincCameraControls().enableCameraTransition();
      } else {
        this.getZincCameraControls().rotateAboutLookAtpoint(newVec3, angle);
      }
    }
  }

  this.setCameraTargetToObject = zincObject => {
    if (this.objectIsInScene(zincObject)) {
      const center = new THREE.Vector3();
      const boundingBox = zincObject.getBoundingBox();
      const viewport = this.getZincCameraControls().getCurrentViewport();
      boundingBox.getCenter(center);
      const target = new THREE.Vector3(viewport.targetPosition[0],
        viewport.targetPosition[1], viewport.targetPosition[2]);
      const eyePosition = new THREE.Vector3(viewport.eyePosition[0],
        viewport.eyePosition[1], viewport.eyePosition[2]);
      const newVec1 = new THREE.Vector3();
      const newVec2 = new THREE.Vector3();
      newVec1.subVectors(eyePosition, target);
      newVec2.addVectors(center, newVec1);
      viewport.eyePosition[0] = newVec2.x;
      viewport.eyePosition[1] = newVec2.y;
      viewport.eyePosition[2] = newVec2.z;
      viewport.targetPosition[0] = center.x;
      viewport.targetPosition[1] = center.y;
      viewport.targetPosition[2] = center.z;
      this.getZincCameraControls().setCurrentCameraSettings(viewport);
    }
  }

  /**
   * Check if stereo effect is enabled.
   * @returns {Boolean}
   */
  this.isStereoEffectEnable = () => {
    return stereoEffectFlag;
  }

  /**
   * Remove a ZincGeometry from this scene if it presents. This will eventually
   * destroy the geometry and free up the memory.
   * @param {Zinc.Geometry} zincGeometry - geometry to be removed from this scene.
   */
  this.removeZincGeometry = zincGeometry => {
    for (let i = 0; i < zincGeometries.length; i++) {
      if (zincGeometry === zincGeometries[i]) {
        scene.remove(zincGeometry.morph);
        zincGeometries.splice(i, 1);
        zincGeometry.dispose();
        return;
      }
    }
  }

  /**
   * Remove a ZincGlyphset from this scene if it presents. This will eventually
   * destroy the glyphset and free up the memory.
   * @param {Zinc.Glyphset} zincGlyphset - glyphset to be removed from this scene.
   */
  this.removeZincGlyphset = zincGlyphset => {
    for (let i = 0; i < zincGlyphsets.length; i++) {
      if (zincGlyphset === zincGlyphsets[i]) {
        scene.remove(zincGlyphset.getGroup());
        zincGlyphsets[i].dispose();
        zincGlyphsets.splice(i, 1);
        return;
      }
    }
  }
  
  /**
   * Remove a zincPointset from this scene if it presents. This will eventually
   * destroy the pointset and free up the memory.
   * @param {Zinc.Pointset} zincPointset - pointset to be removed from this scene.
   */
  this.removeZincPointset= zincPointset => {
    for (let i = 0; i < zincPointsets.length; i++) {
      if (zincPointset === zincPointsets[i]) {
        scene.remove(zincPointset.morph);
        zincPointsets[i].dispose();
        zincPointsets.splice(i, 1);
        return;
      }
    }
  }

    /**
   * Remove a zincLine from this scene if it presents. This will eventually
   * destroy the line and free up the memory.
   * @param {Zinc.Line} zincLine - line to be removed from this scene.
   */
  this.removeZincLine = zincLine => {
    for (let i = 0; i < zincLines.length; i++) {
      if (zincLine === zincLines[i]) {
        scene.remove(zincLine.morph);
        zincLines[i].dispose();
        zincLines.splice(i, 1);
        return;
      }
    }
  }

  /**
   * Remove all objects that are created with ZincJS APIs and it will free the memory allocated.
   * This does not remove obejcts that are added using the addObject APIs.

   */
  this.clearAll = () => {
    for (let i = zincGeometries.length - 1; i >= 0; i--) {
      scene.remove(zincGeometries[i].morph);
      zincGeometries[i].dispose();
    }
    zincGeometries = [];
    for (let i = zincGlyphsets.length - 1; i >= 0; i--) {
      scene.remove(zincGlyphsets[i].getGroup());
      zincGlyphsets[i].dispose();
    }
    zincGlyphsets = [];
    for (let i = zincPointsets.length - 1; i >= 0; i--) {
      scene.remove(zincPointsets[i].morph);
      zincPointsets[i].dispose();
    }
    zincPointsets = [];
    for (let i = zincLines.length - 1; i >= 0; i--) {
      scene.remove(zincLines[i].morph);
      zincLines[i].dispose();
    }
    zincLines = [];
  }
}
