const THREE = require('three');
const MarkerCluster = require('./primitives/markerCluster').MarkerCluster;
const SceneLoader = require('./sceneLoader').SceneLoader;
const SceneExporter = require('./sceneExporter').SceneExporter;
const Viewport = require('./controls').Viewport;
const createBufferGeometry = require('./utilities').createBufferGeometry;
const getCircularTexture = require('./utilities').getCircularTexture;
let uniqueiId = 0;

const getUniqueId = function () {
  return "sc" + uniqueiId++;
}

const defaultMetadata = function() {
  return { 
    Duration: "6 secs",
    OriginalDuration: "-",
    TimeStamps: {}
  }
};

const defaultDuration = 6000;

/**
 * A Scene contains {@link Region},and 
 * {@link CameraControls} which controls the viewport and additional features.
 * It is the main object used for controlling what is and what is not displayed
 * on the renderer.
 * 
 * @class
 * @param {Object} containerIn - Container to create the renderer on.
 * @author Alan Wu
 * @return {Scene}
 */
exports.Scene = function (containerIn, rendererIn) {
  const container = containerIn;
  let videoHandler = undefined;
  let sceneLoader = new SceneLoader(this);
  let minimap = undefined;
  let zincObjectAddedCallbacks = {};
  let zincObjectAddedCallbacks_id = 0;
  let zincObjectRemovedCallbacks = {};
  let zincObjectRemovedCallbacks_id = 0;
  const scene = new THREE.Scene();
  const rootRegion = new (require('./region').Region)(undefined, this);
  scene.add(rootRegion.getGroup());
  const tempGroup = new THREE.Group();
  scene.add(tempGroup);
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
  let pickableObjectsList = [];
  this.forcePickableObjectsUpdate = false;
  this.uuid = getUniqueId();
  let markerCluster = new MarkerCluster(this);
  markerCluster.disable();
  scene.add(markerCluster.group);

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
    this.camera.aspect = getDrawingWidth() / getDrawingHeight();
    this.camera.updateProjectionMatrix();
    this.minimapScissor.updateRequired = true;
    zincCameraControls.onResize();
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
  this.loadView = settings => {
    const viewPort = new Viewport();
    viewPort.setFromObject(settings);
    zincCameraControls.setCurrentCameraSettings(viewPort);
    return true;
  }

  /**
   * Set up multiple views.
   * 
   * @param {Zinc.Viewport} viewData - Viewport data to be loaded. 
   */
  this.setupMultipleViews = (defaultView, entries) => {
    for (const [name, settings] of Object.entries(entries)) {
      const viewport = new Viewport();
      viewport.setFromObject(settings);
      zincCameraControls.addViewport(name, viewport);
    }
    zincCameraControls.setDefaultViewport(defaultView);
  }

  /**
   * Get the bounding box of all the object in this scene only.
   * 
   * @returns {THREE.Box3} 
   */
  this.getBoundingBox = () => {
    return rootRegion.getBoundingBox(true);
  }

  /**
   * Adjust the viewport to display the desired volume provided by the bounding box.
   * 
   * @param {THREE.Box3} boundingBox - The bounding box which describes the volume of
   * which we the viewport should be displaying.
   */
  this.viewAllWithBoundingBox = boundingBox => {
    if (boundingBox) {
      const viewport = zincCameraControls.getViewportFromBoundingBox(boundingBox, 1.0);
      zincCameraControls.setCurrentCameraSettings(viewport);
      markerCluster.markerUpdateRequired = true;
    }
  }

  /**
   * Adjust zoom distance to include all primitives in scene only.
   */
  this.viewAll = () => {
    const boundingBox = this.getBoundingBox();
    this.viewAllWithBoundingBox(boundingBox);
    markerCluster.markerUpdateRequired = true;
  }

  /**
   * A function which iterates through the list of geometries and call the callback
   * function with the geometries as the argument.
   * @param {Function} callbackFunction - Callback function with the geometry
   * as an argument.
   */
  this.forEachGeometry = callbackFunction => {
    rootRegion.forEachGeometry(callbackFunction, true);
  }

  /**
   * A function which iterates through the list of glyphsets and call the callback
   * function with the glyphset as the argument.
   * @param {Function} callbackFunction - Callback function with the glyphset
   * as an argument.
   */
  this.forEachGlyphset = callbackFunction => {
    rootRegion.forEachGlyphset(callbackFunction, true);
  }

  /**
   * A function which iterates through the list of pointsets and call the callback
   * function with the pointset as the argument.
   * @param {Function} callbackFunction - Callback function with the pointset
   * as an argument.
   */
  this.forEachPointset = callbackFunction => {
    rootRegion.forEachPointset(callbackFunction, true);
  }

  /**
  * A function which iterates through the list of lines and call the callback
  * function with the lines as the argument.
  * @param {Function} callbackFunction - Callback function with the lines
  * as an argument.
  */
  this.forEachLine = callbackFunction => {
    rootRegion.forEachLine(callbackFunction, true);
  }

  /** 
   * Find and return all geometries in this scene with the matching GroupName.
   * 
   * @param {String} GroupName - Groupname to match with.
   * @returns {Array}
   */
  this.findGeometriesWithGroupName = GroupName => {
    return rootRegion.findGeometriesWithGroupName(GroupName, true);
  }

  /** 
   * Find and return all pointsets in this scene with the matching GroupName.
   * 
   * @param {String} GroupName - Groupname to match with.
   * @returns {Array}
   */
  this.findPointsetsWithGroupName = GroupName => {
    return rootRegion.findPointsetsWithGroupName(GroupName, true);
  }
  /** 
   * Find and return all glyphsets in this scene with the matching GroupName.
   * 
   * @param {String} GroupName - Groupname to match with.
   * @returns {Array}
   */
  this.findGlyphsetsWithGroupName = GroupName => {
    return rootRegion.findGlyphsetsWithGroupName(GroupName, true);
  }

  /** 
   * Find and return all lines in this scene with the matching GroupName.
   * 
   * @param {String} GroupName - Groupname to match with.
   * @returns {Array}
   */
  this.findLinesWithGroupName = GroupName => {
    return rootRegion.findLinesWithGroupName(GroupName, true);
  }

  /** 
   * Find a list of objects with the specified name, this will
   * tranverse through the region tree to find all child objects
   * with matching name.
   * 
   * @param {String} GroupName - Groupname to match with.
   * @returns {Array}
   */
  this.findObjectsWithGroupName = GroupName => {
    return rootRegion.findObjectsWithGroupName(GroupName, true);
  }

  this.findObjectsWithAnatomicalId = anatomicalId => {
    return rootRegion.findObjectsWithAnatomicalId(anatomicalId, true);
  }

  /** 
   * Get the bounding box of all zinc objects in list.
   * 
   * @param {Array} objectsArray - Groupname to match with.
   * @returns {THREE.Box3}
   */
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

  /** 
   * Convert the vector3 into screen coordinates.
   * 
   * @param {THREE.Vector3} point - Vector 3 containing the point to convert,
   * this vector will be overwritten with the returned value.
   * @param {Array} objectsArray - Groupname to match with.
   * @returns {THREE.Vector3}
   */
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

  /** 
   * Get the screen coordinate of the centroid of provided list of objects.
   * 
   * @param {Array} zincObjects - List of {@link ZincObject}.
   * @returns {THREE.Vector3}
   */
  this.getObjectsScreenXY = zincObjects => {
    if (zincObjects && zincObjects.length > 0) {
      let boundingBox = this.getBoundingBoxOfZincObjects(zincObjects);
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      return this.vectorToScreenXY(center);
    }
    return undefined;
  }

  /** 
   * Get the screen coordinate of the centroid of all objects 
   * in scene with the provided name.
   * 
   * @param {String} name - List of {@link ZincObject}.
   * @returns {THREE.Vector3}
   */
  this.getNamedObjectsScreenXY = name => {
    let zincObjects = this.findObjectsWithGroupName(name);
    return this.getObjectsScreenXY(zincObjects);
  };

  /** 
   * Add zinc object into the root {@link Region} of sfcene.
   * 
   * @param {ZincObject} - zinc object ot be added.
   * @returns {THREE.Vector3}
   */
  this.addZincObject = zincObject => {
    if (zincObject) {
      rootRegion.addZincObject(zincObject);
      if (zincCameraControls)
        zincCameraControls.calculateMaxAllowedDistance(this);
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
    sceneLoader.loadGlyphsetURL(rootRegion, metaurl, glyphurl, groupName, finishCallback);
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
    sceneLoader.loadPointsetURL(rootRegion, url, timeEnabled, morphColour, groupName, finishCallback);
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
    sceneLoader.loadLinesURL(rootRegion, url, timeEnabled, morphColour, groupName, finishCallback);
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
    sceneLoader.loadSTL(rootRegion, url, groupName, finishCallback);
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
    sceneLoader.loadOBJ(rootRegion, url, groupName, finishCallback);
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
    sceneLoader.loadMetadataURL(rootRegion, url, finishCallback, allCompletedCallback);
  }

  /**
   * Load a legacy model(s) format with the provided URLs and parameters. This only loads the geometry
   * without any of the metadata. Therefore, extra parameters should be provided.
   * 
   * @deprecated
   */
  this.loadModelsURL = (urls, colours, opacities, timeEnabled, morphColour, finishCallback) => {
    sceneLoader.loadModelsURL(rootRegion. urls, colours, opacities, timeEnabled, morphColour, finishCallback);
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
  this.loadGLTF = (url, finishCallback, allCompletedCallback, options) => {
    sceneLoader.loadGLTF(rootRegion, url, finishCallback, allCompletedCallback, options);
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
    const time = rootRegion.getCurrentTime();
    if (time !== -1) 
      return time;
    
    return 0;
  }

  /**
   * Set the current time of all the geometries and glyphsets of this scene.
   * @param {Number} time  - Value to set the time to.
   */
  this.setMorphsTime = (time) => {
    if (videoHandler != undefined) {
      videoHandler.setMorphTime(time, duration);
    }
    rootRegion.setMorphTime(time, true);
  }

  /**
   * Check if any object in this scene is time varying.
   * 
   * @return {Boolean}
   */
  this.isTimeVarying = () => {
    if (videoHandler && videoHandler.video && !videoHandler.video.error) {
    	return true;
    }
    return rootRegion.isTimeVarying();
  }

  /**
   * Update geometries and glyphsets based on the calculated time.
   * @private
   */
  this.renderGeometries = (playRate, delta, playAnimation) => {
    // Let video dictates the progress if one is present
    let options = {};
    options.camera = zincCameraControls;
    //Global markers flag, marker can be set at individual zinc object level
    //overriding this flag.
    options.displayMarkers =  this.displayMarkers;
    options.markerCluster = markerCluster;
    options.markersList = markerCluster.markers;
    options.ndcToBeUpdated = false;
    //Always set marker cluster update required when playAnimation is true
    //to make sure it is updated when it stops
    if (playAnimation) {
      options.markerCluster.markerUpdateRequired = true;
    }
	  if (videoHandler) {
		  if (videoHandler.isReadyToPlay()) {
			  if (playAnimation) {
          videoHandler.video.play();
			  } else {
				  videoHandler.video.pause();
			  }
        const currentTime = videoHandler.video.currentTime /
          videoHandler.getVideoDuration() * duration;
			  if (0 == sceneLoader.toBeDownloaded) {
				  zincCameraControls.setTime(currentTime);
				  options.ndcToBeUpdated = zincCameraControls.update(0);
          rootRegion.setMorphTime(currentTime, true);
          rootRegion.renderGeometries(0, 0, playAnimation, zincCameraControls, options, true);
			  } else {
				  zincCameraControls.update(0);
			  }
			  //console.log(videoHandler.video.currentTime / videoHandler.getVideoDuration() * 6000);
		  } else {
			  myPlayRate = 0;
		  }
	  } else {
		  if (0 == sceneLoader.toBeDownloaded) {
        options.ndcToBeUpdated = zincCameraControls.update(delta);
        rootRegion.renderGeometries(playRate, delta, playAnimation, zincCameraControls, options, true);
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

  this.setVideoHandler = (videoHandlerIn) => {
    if (!videoHandler)
      videoHandler = videoHandlerIn;
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
    rootRegion.setDuration(durationIn);
    duration = durationIn;
    zincCameraControls.setPathDuration(durationIn);
    sceneLoader.duration = durationIn;
  }

  /**
   * Get the default duration value.
   * @return {Number}
   */
  this.getDuration = () => {
    return duration;
  }

  /**
   * Enable or disable stereo effect of this scene.
   * @param {Boolean} stereoFlag - Indicate either stereo effect control 
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


  /**
   * Check rather object is in scene.
   * 
   * @return {Boolean}
   */
  this.objectIsInScene = zincObject => {
    return rootRegion.objectIsInRegion(zincObject, true);
  }

  /**
   * Rotate the camera view to view the entirety of the 
   * bounding box with a smooth transition within the providied
   * transitionTime.
   * 
   * @param {THREE.Box3} boundingBox - the bounding box to target
   * @param {Number} transitionTime - Duration to perform the transition.
   */
  this.alignBoundingBoxToCameraView = (boundingBox, transitionTime) => {
    if (boundingBox) {
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      const viewport = this.getZincCameraControls().getCurrentViewport();
      const target = new THREE.Vector3(viewport.targetPosition[0],
        viewport.targetPosition[1], viewport.targetPosition[2]);
      const eyePosition = new THREE.Vector3(viewport.eyePosition[0],
        viewport.eyePosition[1], viewport.eyePosition[2]);
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
      markerCluster.markerUpdateRequired = true;
    }
  }


  /**
   * Translate the camera view to the center of the 
   * bounding box with a smooth transition within the providied
   * transitionTime.
   * 
   * @param {THREE.Box3} boundingBox - the bounding box to target
   * @param {Number} transitionTime - Duration to perform the transition.
   */
  this.translateBoundingBoxToCameraView = (boundingBox, scaleRadius, transitionTime) => {
    if (boundingBox) {
      const oldViewport = this.getZincCameraControls().getCurrentViewport();
      const viewport = this.getZincCameraControls().getViewportFromBoundingBox(boundingBox, scaleRadius);
      if (transitionTime > 0) {
        this.getZincCameraControls().cameraTransition(oldViewport,
          viewport, transitionTime);
        this.getZincCameraControls().enableCameraTransition();
      }
      markerCluster.markerUpdateRequired = true;
    }
  }

  /**
   * Transition the camera into viewing the zinc object with a 
   * smooth transition within the providied transitionTime.
   * 
   * @param {ZincObject} zincObject - the bounding box to target
   * @param {Number} transitionTime - Duration to perform the transition.
   */
  this.alignObjectToCameraView = (zincObject, transitionTime) => {
    if (this.objectIsInScene(zincObject)) {
      const boundingBox = zincObject.getBoundingBox();
      this.alignBoundingBoxToCameraView(boundingBox, transitionTime);
    }
  }

  /**
   * Set the camera to point to the centroid of the zinc object.
   * 
   * @param {ZincObject} zincObject - the bounding box to target
   */
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
      markerCluster.markerUpdateRequired = true;
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
    rootRegion.removeZincObject(zincObject);
    if (zincCameraControls) {
      zincCameraControls.calculateMaxAllowedDistance(this);
    }
    markerCluster.markerUpdateRequired = true;
  }

  /**
   * Update pickable objects list
   */
  this.updatePickableThreeJSObjects = () => {
    pickableObjectsList.length = 0;
    if (markerCluster.isEnabled) {
      pickableObjectsList.push(markerCluster.group);
    }
    rootRegion.getPickableThreeJSObjects(pickableObjectsList, true);
    this.forcePickableObjectsUpdate = false;
  }

  /**
   * Get all pickable objects.
   */
  this.getPickableThreeJSObjects = () => {
    //The list will only be updated if changes have been made
    //in region or a flag has been raise
    if (this.forcePickableObjectsUpdate || 
      rootRegion.checkPickableUpdateRequred(true)) {
      this.updatePickableThreeJSObjects();
    }
    return pickableObjectsList;
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

  this.isWebGL2 = () => {
    return rendererIn.isWebGL2();
  }

  /**
   * Remove all objects that are created with ZincJS APIs and it will free the memory allocated.
   * This does not remove obejcts that are added using the addObject APIs.
   */
  this.clearAll = () => {
    markerCluster.clear();
    rootRegion.clear(true);
    this.clearZincObjectAddedCallbacks();
    this.clearZincObjectRemovedCallbacks();
    sceneLoader.toBeDwonloaded = 0;
    if (zincCameraControls) {
      zincCameraControls.calculateMaxAllowedDistance(this);
    }
    markerCluster.markerUpdateRequired = true;
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

  /**
   * Export the scene in GLTF format, it can either return it in
   * string or binary form.
   * 
   * @param {Boolean} binary - Indicate it should be exported as binary or
   * text.
   * 
   * @return {Promise} The exported data if the promise resolve successfully
   */
  this.exportGLTF = (binary) => {
    const exporter = new SceneExporter(this);
    return exporter.exportGLTF(binary);
  }

  /**
   * Get the root region of the scene.
   * 
   * @return {Region} Return the root region of the scene
   */
  this.getRootRegion = () => {
    return rootRegion;
  }

  /**
   * Create points in region specified in the path 
   *
   */
  this.createLines = ( regionPath, groupName, coords, colour ) => {
    let region = rootRegion.findChildFromPath(regionPath);
    if (region === undefined) {
      region = rootRegion.createChildFromPath(regionPath);
    }
    return region.createLines(groupName, coords, colour);
  }

  /**
   * Create points in region specified in the path 
   *
   */
  this.createPoints = ( regionPath, groupName, coords, labels, colour ) => {
    let region = rootRegion.findChildFromPath(regionPath);
    if (region === undefined) {
      region = rootRegion.createChildFromPath(regionPath);
    }
    return region.createPoints(groupName, coords, labels, colour);
  }

	/**
	 * Add a callback function which will be called everytime zinc object is added.
	 * @param {Function} callbackFunction - callbackFunction to be added.
	 * 
	 * @return {Number}
	 */
	this.addZincObjectAddedCallbacks = callbackFunction => {
		zincObjectAddedCallbacks_id = zincObjectAddedCallbacks_id + 1;
		zincObjectAddedCallbacks[zincObjectAddedCallbacks_id] = callbackFunction;
		return zincObjectAddedCallbacks_id;
	}

	/**
	 * Add a callback function which will be called everytime zinc object is removed.
	 * @param {Function} callbackFunction - callbackFunction to be added.
	 * 
	 * @return {Number}
	 */
	this.addZincObjectRemovedCallbacks = callbackFunction => {
		zincObjectRemovedCallbacks_id = zincObjectRemovedCallbacks_id + 1;
		zincObjectRemovedCallbacks[zincObjectRemovedCallbacks_id] = callbackFunction;
		return zincObjectRemovedCallbacks_id;
	}
	
	/**
	 * Remove a callback function that is previously added to the scene.
	 * @param {Number} id - identifier of the previously added callback function.
	 */
	this.removeZincObjectAddedCallbacks = id => {
		if (id in zincObjectAddedCallbacks_id) {
   			delete zincObjectAddedCallbacks[id];
		}
	}

	/**
	 * Remove a callback function that is previously added to the scene.
	 * @param {Number} id - identifier of the previously added callback function.
	 */
	this.removeZincObjectRemovedCallbacks = id => {
		if (id in zincObjectRemovedCallbacks_id) {
   			delete zincObjectRemovedCallbacks[id];
		}
	}

  /**
	 * Clear all zinc object callback function
	 */
	this.clearZincObjectAddedCallbacks = () => {
		zincObjectAddedCallbacks = {};
    zincObjectAddedCallbacks_id = 0;
	}

  /**
	 * Clear all zinc object callback function
	 */
	this.clearZincObjectRemovedCallbacks = () => {
		zincObjectRemovedCallbacks = {};
    zincObjectRemovedCallbacks_id = 0;
	}

  /**
	 * Used to trigger zinc object added callback
	 */
  this.triggerObjectAddedCallback = (zincObject) => {
    for (let key in zincObjectAddedCallbacks) {
      if (zincObjectAddedCallbacks.hasOwnProperty(key)) {
        zincObjectAddedCallbacks[key](zincObject);
      }
    }
  }

  /**
	 * Used to trigger zinc object removed callback
	 */
  this.triggerObjectRemovedCallback= (zincObject) => {
    for (let key in zincObjectRemovedCallbacks) {
      if (zincObjectRemovedCallbacks.hasOwnProperty(key)) {
        zincObjectRemovedCallbacks[key](zincObject);
      }
    }
  }

  /*
	 * Add temporary points to the scene which can be removed
   * with clearTemporaryPrimitives method.
	 */
  this.addTemporaryPoints = (coords, colour) => {
    const geometry = createBufferGeometry(coords.length, coords);
    let material = new THREE.PointsMaterial({ alphaTest: 0.5, size: 15,
      color: colour, sizeAttenuation: false });
    const texture = getCircularTexture();
    material.map = texture;
    let point = new (require('./three/Points').Points)(geometry, material);
    tempGroup.add(point);
    return point;
  }

  /*
	 * Add temporary lines to the scene which can be removed
   * with clearTemporaryPrimitives method.
	 */
  this.addTemporaryLines = (coords, colour) => {
    const geometry = createBufferGeometry(coords.length, coords);
    const material = new THREE.LineBasicMaterial({color:colour});
    const line = new (require("./three/line/LineSegments").LineSegments)(geometry, material);
    tempGroup.add(line);
    return line;
  }

  /*
	 * Remove object from temporary objects list
	 */
  this.removeTemporaryPrimitive = (object) => {
    tempGroup.remove(object);
    object.geometry.dispose();
    object.material.dispose();
  }

  /*
	 * Remove all temporary primitives.
	 */
  this.clearTemporaryPrimitives = () => {
    const children = tempGroup.children;
    children.forEach(child => {
      child.geometry.dispose();
      child.material.dispose();
    });
    tempGroup.clear();
  }

  /*
	 * Create primitive based on the bounding box of scene and
   * add to specify region and group name.
	 */
  this.addBoundingBoxPrimitive = (regionPath, group, colour, opacity,
    visibility, boundingBox = undefined) => {
    let region = rootRegion.findChildFromPath(regionPath);
    if (region === undefined) {
      region = rootRegion.createChildFromPath(regionPath);
    }
    const box = boundingBox ? boundingBox : this.getBoundingBox();
    const dim = new THREE.Vector3().subVectors(box.max, box.min);
    const boxGeo = new THREE.BoxGeometry(dim.x, dim.y, dim.z);
    dim.addVectors(box.min, box.max).multiplyScalar( 0.5 );
    const primitive = region.createGeometryFromThreeJSGeometry(
      group, boxGeo, colour, opacity, visibility, 10000);
    primitive.setPosition(dim.x, dim.y, dim.z);
    return primitive;
  }

  /*
	 * Enable marker cluster to work with markers
	 */
  this.enableMarkerCluster = (flag) => {
    if (flag) {
      markerCluster.markerUpdateRequired = true;
      markerCluster.enable();
    } else {
      markerCluster.markerUpdateRequired = false;
      markerCluster.disable();
    }
    this.forcePickableObjectsUpdate = true;
  }
}


