const THREE = require('three');
const SceneLoader = require('./sceneLoader').SceneLoader;

const defaultMetadata = function() {
  return { 
    Duration: "6 secs",
    OriginalDuration: "-",
    TimeStamps: {}
  }
};

const defaultDuration = 6000;

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
exports.Scene = function (containerIn, rendererIn) {
  const container = containerIn;
  let zincObjects = [];
  let videoHandler = undefined;
  let sceneLoader = new SceneLoader(this);
  let minimap = undefined;
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
  let duration = 6000;
  let zincCameraControls = undefined;
  this.sceneName = undefined;
  let stereoEffectFlag = false;
  let stereoEffect = undefined;
  this.autoClearFlag = true;
  this.displayMarkers = false;
  this.displayMinimap = false;
  this.minimapScissor = {
    x_offset: 16,
    y_offset: 16,
    width: 128,
    height: 128,
    align: "top-left",
    updateRequired: true
  };
  let scissor = {x: 0,  y: 0};
  let metadata = defaultMetadata();
  let _markerTarget = new THREE.Vector2();

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
    this.minimapScissor.updateRequired = true;
  }

  /**
   * Reset the viewport of this scene to its original state. 
   */
  this.resetView = () => {
    this.onWindowResize();
    zincCameraControls.resetView();
  }

  /**
   * Set the zoom level by unit scroll rate
   */
  this.changeZoomByScrollRateUnit = unit => {
    zincCameraControls.changeZoomByScrollRateUnit(unit);
  }

  //Setup the camera for this scene, it also initialise the lighting
  const setupCamera = () => {
    this.camera = new THREE.PerspectiveCamera(40, getDrawingWidth() / getDrawingHeight(), 0.0, 10.0);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(this.ambient);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    scene.add(this.directionalLight);
    zincCameraControls = new (require('./controls').CameraControls)(this.camera, rendererIn.domElement, rendererIn, this);

    zincCameraControls.setDirectionalLight(this.directionalLight);
    zincCameraControls.resetView();

    minimap = new (require('./minimap').Minimap)(this);
  };

  setupCamera();

  /**
   * Load the viewport Data from the argument  {@link Zinc.Viewport} and set it as 
   * the default viewport of this scene.
   * 
   * @param {Zinc.Viewport} viewData - Viewport data to be loaded. 
   */
  this.loadView = ({ nearPlane, farPlane, eyePosition, targetPosition, upVector}) => {
    const viewPort = new (require('./controls').Viewport)();
    viewPort.nearPlane = nearPlane;
    viewPort.farPlane = farPlane;
    viewPort.eyePosition = eyePosition;
    viewPort.targetPosition = targetPosition;
    viewPort.upVector = upVector;
    zincCameraControls.setDefaultCameraSettings(viewPort);
    zincCameraControls.resetView();
    return true;
  }

  /**
   * Get the bounding box of all the object in this scene only.
   * 
   * @returns {THREE.Box3} 
   */
  this.getBoundingBox = () => {
    let boundingBox1 = undefined, boundingBox2 = undefined;
    for (let i = 0; i < zincObjects.length; i++) {
      boundingBox2 = zincObjects[i].getBoundingBox();
      if (boundingBox1 == undefined) {
        boundingBox1 = boundingBox2;
      } else {
        if (boundingBox2)
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
    for (let i = zincObjects.length - 1; i >= 0; i--) {
      if (zincObjects[i].isGeometry)
        callbackFunction(zincObjects[i]);
    }
  }

  /**
   * A function which iterates through the list of glyphsets and call the callback
   * function with the glyphset as the argument.
   * @param {Function} callbackFunction - Callback function with the glyphset
   * as an argument.
   */
  this.forEachGlyphset = callbackFunction => {
    for (let i = zincObjects.length - 1; i >= 0; i--) {
      if (zincObjects[i].isGlyphset)
        callbackFunction(zincObjects[i]);
    }
  }

  /**
   * A function which iterates through the list of pointsets and call the callback
   * function with the pointset as the argument.
   * @param {Function} callbackFunction - Callback function with the pointset
   * as an argument.
   */
  this.forEachPointset = callbackFunction => {
    for (let i = zincObjects.length - 1; i >= 0; i--) {
      if (zincObjects[i].isPointset)
        callbackFunction(zincObjects[i]);
    }
  }

  /**
  * A function which iterates through the list of lines and call the callback
  * function with the lines as the argument.
  * @param {Function} callbackFunction - Callback function with the lines
  * as an argument.
  */
  this.forEachLine = callbackFunction => {
    for (let i = zincObjects.length - 1; i >= 0; i--) {
      if (zincObjects[i].isLines)
        callbackFunction(zincObjects[i]);
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
    for (let i = 0; i < zincObjects.length; i++) {
      if (zincObjects[i].isGeometry &&
        (zincObjects[i].groupName == GroupName)) {
        geometriesArray.push(zincObjects[i]);
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
    for (let i = 0; i < zincObjects.length; i++) {
      if (zincObjects[i].isPointset &&
        (zincObjects[i].groupName == GroupName)) {
    	  pointsetsArray.push(zincObjects[i]);
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
    for (let i = 0; i < zincObjects.length; i++) {
      if (zincObjects[i].isGlyphset &&
        (zincObjects[i].groupName == GroupName)) {
        glyphsetsArray.push(zincObjects[i]);
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
    for (let i = 0; i < zincObjects.length; i++) {
      if (zincObjects[i].isLines &&
        (zincObjects[i].groupName == GroupName)) {
    	  linesArray.push(zincObjects[i]);
      }
    }
    return linesArray;
  }

  this.findObjectsWithGroupName = GroupName => {
    const objectsArray = [];
    for (let i = 0; i < zincObjects.length; i++) {
      if (zincObjects[i].groupName == GroupName) {
    	  objectsArray.push(zincObjects[i]);
      }
    }
    return objectsArray;
  }

  this.findObjectsWithAnatomicalId = anatomicalId => {
    const objectsArray = [];
    for (let i = 0; i < zincObjects.length; i++) {
      if (zincObjects[i].anatomicalId == anatomicalId) {
    	  objectsArray.push(zincObjects[i]);
      }
    }
    return objectsArray;
  }

  this.getBoundingBoxOfZincObjects = objectsArray => {
    let boundingBox = undefined;
    for (let i = 0; i < objectsArray.length; i++) {
      let box = objectsArray[i].getBoundingBox();
      if (box) {
        if (!boundingBox)
          boundingBox = box;
        else
          boundingBox.union(box);
      }
    }
    return boundingBox;
  }

  this.vectorToScreenXY = point => {
    point.project(this.camera);
    let width = getDrawingWidth();
    let height = getDrawingHeight();
    let widthHalf = (width / 2);
    let heightHalf = (height / 2);
    point.x = (point.x * widthHalf) + widthHalf;
    point.y = - (point.y * heightHalf) + heightHalf;
    return point;
  }

  this.getObjectsScreenXY = zincObjects => {
    if (zincObjects && zincObjects.length > 0) {
      let boundingBox = this.getBoundingBoxOfZincObjects(zincObjects);
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      return this.vectorToScreenXY(center);
    }
    return undefined;
  }

  this.getNamedObjectsScreenXY = name => {
    let zincObjects = this.findObjectsWithGroupName(name);
    return this.getObjectsScreenXY(zincObjects);
  };

  this.addZincObject = zincObject => {
    if (zincObject) {
      scene.add(zincObject.morph);
      zincObjects.push(zincObject);
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
    sceneLoader.loadLinesURL(url, timeEnabled, morphColour, groupName, finishCallback);
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

  /**
   * Load GLTF into this scene object.
   */
  this.loadGLTF = (url, finishCallback, options) => {
    sceneLoader.loadGLTF(url, finishCallback, options);
  }
  
  /**
   * Add a user provided {THREE.Geometry} into  the scene as zinc geometry.
   * 
   * @param {Three.Geometry} geometry - The threejs geometry to be added as {@link Zinc.Geometry}.
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
    colour,
    opacity,
    localTimeEnabled,
    localMorphColour,
    finishCallback,
    materialIn,
    groupName
  ) => {
    let options = {};
    options.colour = colour;
    options.opacity = opacity;
    options.localTimeEnabled = localTimeEnabled;
    options.localMorphColour = localMorphColour
    const newGeometry = new (require('./primitives/geometry').Geometry)();
    newGeometry.createMesh(geometryIn, materialIn, options);
    if (newGeometry.morph) {
      newGeometry.setName(groupName);
      this.addZincObject(newGeometry);
      newGeometry.setDuration(duration);
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
    if (zincObjects[0] != undefined) {
      return zincObjects[0].getCurrentTime();
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
    for (let i = 0; i < zincObjects.length; i++) {
      zincObjects[i].setMorphTime(time);
    }
  }

  /**
   * Check if any object in this scene is time varying.
   * 
   * @return {Boolean}
   */
  this.isTimeVarying = () => {
    for (let i = 0; i < zincObjects.length; i++) {
      if (zincObjects[i].isTimeVarying()) {
        return true;
      }
    }
    if (videoHandler && videoHandler.video && !videoHandler.video.error) {
    	return true;
    }
    return false;
  }

  /**
   * Update geometries and glyphsets based on the calculated time.
   * @private
   */
  this.renderGeometries = (playRate, delta, playAnimation) => {
    // Let video dictates the progress if one is present
    let options = {};
    options.camera = zincCameraControls;
    options.displayMarkers =  this.displayMarkers;
    options.markerDepths = [];
	  if (videoHandler) {
		  if (videoHandler.isReadyToPlay()) {
			  if (playAnimation) {
          videoHandler.video.play();
			  } else {
				  videoHandler.video.pause();
			  }
        var currentTime = videoHandler.video.currentTime /
          videoHandler.getVideoDuration() * duration;
			  if (0 == sceneLoader.toBeDownloaded) {
				  zincCameraControls.setTime(currentTime);
				  zincCameraControls.update(0);
				  for (let i = 0; i < zincObjects.length; i++) {
					  zincObjects[i].setMorphTime(currentTime);
					  zincObjects[i].render(0, playAnimation);
				  }
			  } else {
				  zincCameraControls.update(0);
			  }
			  //console.log(videoHandler.video.currentTime / videoHandler.getVideoDuration() * 6000);
		  } else {
			  myPlayRate = 0;
		  }
	  } else {
		  if (0 == sceneLoader.toBeDownloaded) {
        zincCameraControls.update(delta);
			  for (let i = 0; i < zincObjects.length; i++) {
				  zincObjects[i].render(playRate * delta, playAnimation, options);
        }
		  } else {
			  zincCameraControls.update(0);
		  }
    }
    //process markers visibility and size
    if (this.displayMarkers && (playAnimation === false)) {
      if (options.markerDepths.length > 0) {
        let min = Math.min(...options.markerDepths);
        let max = Math.max(...options.markerDepths);
			  for (let i = 0; i < zincObjects.length; i++) {
				  zincObjects[i].processMarkerVisual(min, max, options);
        }
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

  let getWindowsPosition = (align, x_offset, y_offset, width, height,
    renderer_width, renderer_height) => {
    let x = 0;
    let y = 0;
    if (align.includes("top")) {
      y = renderer_height - height - y_offset;
    } else if (align.includes("bottom")) {
      y = y_offset;
    } else {
      y = Math.floor((renderer_height - height) / 2.0);
    }
    if (align.includes("left")) {
      x = x_offset;
    } else if (align.includes("right")) {
      x = renderer_width - x_offset- width;
    } else {
      x = Math.floor((renderer_width - width) / 2.0);
    }
    return {x: x, y: y};
  }

  const renderMinimap = renderer => {
    if (this.displayMinimap === true) {
      renderer.setScissorTest(true);
      renderer.getSize(_markerTarget);
      if (this.minimapScissor.updateRequired) {
        scissor = getWindowsPosition(this.minimapScissor.align,
          this.minimapScissor.x_offset, 
          this.minimapScissor.y_offset, 
          this.minimapScissor.width,
          this.minimapScissor.height,
          _markerTarget.x, _markerTarget.y);
        this.minimapScissor.updateRequired = false;
      }
      renderer.setScissor(
        scissor.x,
        scissor.y,
        this.minimapScissor.width,
        this.minimapScissor.height);
      renderer.setViewport(
        scissor.x,
        scissor.y,
        this.minimapScissor.width,
        this.minimapScissor.height); 
      minimap.updateCamera();
      scene.add(minimap.mask);
      renderer.render(scene, minimap.camera);
      scene.remove(minimap.mask);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, _markerTarget.x, _markerTarget.y);
    }
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
    } else {
      renderer.render(scene, this.camera);
      renderMinimap(renderer);
    }
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
   * Set the default duration value for geometries and glyphsets
   * that are to be loaded into this scene.
   * @param {Number} durationIn - duration of the scene.
   */
  this.setDuration = durationIn => {
    duration = durationIn;
    for (let i = 0; i < zincObjects.length; i++) {
      zincObjects[i].setDuration(duration);
    }
    zincCameraControls.setPathDuration(durationIn);
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
    for (let i = 0; i < zincObjects.length; i++) {
      if (zincObject === zincObjects[i]) {
        return true;
      }
    }
    return false;
  }

  this.alignBoundingBoxToCameraView = (boundingBox, transitionTime) => {
    if (boundingBox) {
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      const viewport = this.getZincCameraControls().getCurrentViewport();
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

  this.alignObjectToCameraView = (zincObject, transitionTime) => {
    if (this.objectIsInScene(zincObject)) {
      const boundingBox = zincObject.getBoundingBox();
      this.alignBoundingBoxToCameraView(boundingBox, transitionTime);
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
   * Remove a ZincObject from this scene if it presents. This will eventually
   * destroy the object and free up the memory.
   * @param {Zinc.Object} zincObject - object to be removed from this scene.
   */
  this.removeZincObject = zincObject => {
    for (let i = 0; i < zincObjects.length; i++) {
      if (zincObject === zincObjects[i]) {
        scene.remove(zincObject.morph);
        zincObjects.splice(i, 1);
        zincObject.dispose();
        return;
      }
    }
  }

  /**
   * Remove all objects that are created with ZincJS APIs and it will free the memory allocated.
   * This does not remove obejcts that are added using the addObject APIs.
   */
  this.getPickableThreeJSObjects = () => {
    let returnedObjects = [];
    for (let i = zincObjects.length - 1; i >= 0; i--) {
      if (zincObjects[i].morph && (zincObjects[i].morph.visible === true)) {
        if (this.displayMarkers) {
          let marker = zincObjects[i].marker;
          if (marker && marker.isEnabled()) {
            returnedObjects.push(marker.morph);
          }
        } else {
          returnedObjects.push(zincObjects[i].morph);
        }
      }
    }
    return returnedObjects;
  }

  /**
   * Get the Normalised coordinates on minimap if mouse event is
   * inside the minimap 
   */
  this.getNormalisedMinimapCoordinates = (renderer, event) => {
    if (this.displayMinimap) {
      const target = new THREE.Vector2();
      renderer.getSize(target);
      let offsetY = target.y - event.clientY;
      if (((scissor.x + this.minimapScissor.width) > event.clientX) &&
        (event.clientX > scissor.x) && 
        ((scissor.y + this.minimapScissor.height) > offsetY) &&
        (offsetY > scissor.y)) {
          let x = ((event.clientX - scissor.x) /
            this.minimapScissor.width) * 2.0  - 1.0;
          let y = ((offsetY - scissor.y) /
            this.minimapScissor.height) * 2.0  - 1.0;
          return {"x": x, "y": y};
      }
    }
    return undefined;
  }

  /**
   * Get the coordinates difference of the current viewing
   * point and projected coordinates.
   */
  this.getMinimapDiffFromNormalised = (x, y) => {
    if (minimap)
      return minimap.getDiffFromNormalised(x, y);
    return undefined;
  }

  /**
   * Remove all objects that are created with ZincJS APIs and it will free the memory allocated.
   * This does not remove obejcts that are added using the addObject APIs.
   */
  this.clearAll = () => {
    for (let i = zincObjects.length - 1; i >= 0; i--) {
        scene.remove(zincObjects[i].morph);
      zincObjects[i].dispose();
    }
    zincObjects = [];
    sceneLoader.toBeDwonloaded = 0;
  }

  /**
   * All time stamp to the metadata TimeStamps field.
   */
  this.addMetadataTimeStamp = (key, time) => {
    metadata["TimeStamps"][key] = convertDurationObjectTomSec(time);
  }
  
  /**
   * Get a specific metadata field.
   */
  this.getMetadataTag = key => {
    return metadata[key];
  }

  /**
   * Get all metadata set for the scene.
   */
  this.getMetadata = () => {
    return metadata;
  }

  /**
   * Set a specific metadata field.
   */
  this.setMetadataTag = (key, value) => {
    metadata[key] = value;
  }

  /**
   * Remove a specific metadata field.
   */
  this.removeMetadataTag = key => {
    delete metadata[key];
  }

  /**
   * Reset all metadata fields to original value.
   */
  this.resetMetadata = () => {
    metadata = defaultMetadata();
  }

  /**
   * Reset duration of scene to default value.
   */
  this.resetDuration = () => {
    this.setDuration(defaultDuration);
  }

  // Turn the object into a readable string {years: years,months: months, 
  // weeks: weeks, days: days, hours: hours, mins: mins, secs: secs } 
  const convertDurationObjectToString = duration => {
    return [
      ...(duration.years ? [`${duration.years}years`] : []),
      ...(duration.months ? [`${duration.months}months`] : []),
      ...(duration.weeks ? [`${duration.weeks}weeks`] : []),
      ...(duration.days ? [`${duration.days}days`] : []),
      ...(duration.hours ? [`${duration.hours}hours`] : []),
      ...(duration.mins ? [`${duration.mins}mins`] : []),
      ...(duration.secs ? [`${duration.secs}secs`] : []),
    ].join(' ');
  }

  // Turn the object into a number representing milliesecond {years: years,months: months, 
  // weeks: weeks, days: days, hours: hours, mins: mins, secs: secs } 
  const convertDurationObjectTomSec = duration => {
    return duration.years ? duration.years * 31536000000 : 0 +
      duration.months ? duration.months * 2592000000 : 0 +
      duration.weeks ? duration.weeks * 604800000 : 0 +
      duration.days ? duration.days * 86400000 : 0 +
      duration.hours ? duration.hours * 3600000 : 0 +
      duration.mins ? duration.mins * 60000 : 0 +
      duration.secs ? duration.secs * 1000 : 0;
  }

  // Set the readable duration and timer using an object
  // with the following format {years: years,months: months, weeks: weeks, days: days,
  // hours: hours, mins: mins, secs: secs } 
  this.setDurationFromObject = duration => {
    const string = convertDurationObjectToString(duration);
    const millisec = convertDurationObjectTomSec(duration);
    this.setMetadataTag("Duration", string);
    this.setDuration(millisec);
  }

  // Set the readable original duration using an object
  // with the following format {years: years,months: months, weeks: weeks, days: days,
  // hours: hours, mins: mins, secs: secs } 
  this.setOriginalDurationFromObject = duration => {
    const string = convertDurationObjectToString(duration);
    this.setMetadataTag("OriginalDuration", string);
  }
}
