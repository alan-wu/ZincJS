const THREE = require('three');
const resolveURL = require('./utilities').resolveURL;

/**
 * Object with containg viewport information used in ZincJS.
 * 
 * @class
 * @author Alan Wu
 * @return {Viewport}
 */
const Viewport = function () {
  /** @property {Number} */
	this.nearPlane = 0.168248;
  /** @property {Number} */
	this.farPlane = 6.82906;
  /**@property {Array} */
	this.eyePosition = [0.5, -2.86496, 0.5];
  /** @property {Array} */
	this.targetPosition = [0.5, 0.5, 0.5];
  /** @property {Array} */
	this.upVector = [ 0.0, 0.0, 1.0];
	const _this = this;

  this.setFromObject = ({ nearPlane, farPlane, eyePosition, targetPosition, upVector }) => {
    _this.nearPlane = nearPlane;
    _this.farPlane = farPlane;
    _this.eyePosition = eyePosition;
    _this.targetPosition = targetPosition;
    _this.upVector = upVector;
  }
};

/**
 * Provides the basic controls for a scene.
 * 
 * @class
 * @author Alan Wu
 * @return {CameraControls}
 */
const CameraControls = function ( object, domElement, renderer, scene ) {
	const MODE = { NONE: -1, DEFAULT: 0, PATH: 1, SMOOTH_CAMERA_TRANSITION: 2, AUTO_TUMBLE: 3, ROTATE_TRANSITION: 4, MINIMAP: 5, SYNC_CONTROL: 6 };
  /** 
   * Actions states.
   * Available states are NONE, ROTATE, ZOOM, PAN, TOUCH_ROTATE, TOUCH_ZOOM, TOUCH_PAN and SCROLL.
   * @property {Object} 
   */
	const STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM: 4, TOUCH_PAN: 5, SCROLL: 6, KEYBOARD_ZOOM: 7, KEYBOARD_ROTATE: 8, KEYBOARD_PAN: 9 };
  const ROTATE_DIRECTION = { NONE: -1, FREE: 1, HORIZONTAL: 2, VERTICAL: 3 };
	const KEYBOARD = { ARROWLEFT: 37, ARROWUP: 38, ARROWRIGHT: 39, ARROWDOWN: 40, NUMPADADD: 107, NUMPADSUBTRACT: 109, EQUAL: 187, MINUS: 189 };
  /** 
   * Available click actions are MAIN, AUXILIARY and SECONARY.
   * @property {Object} 
   */
	const CLICK_ACTION = {};
	CLICK_ACTION.MAIN = STATE.ROTATE;
	CLICK_ACTION.AUXILIARY = STATE.ZOOM;
	CLICK_ACTION.SECONDARY = STATE.PAN;
	this.cameraObject = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;
	this.renderer = renderer;
	this.scene = scene ;
	this.tumble_rate = 1.5;
	this.pointer_x = 0;
	this.pointer_y = 0;
	this.pointer_x_start = 0;
	this.pointer_y_start = 0;
	this.previous_pointer_x = 0;
	this.previous_pointer_y = 0;
	this.near_plane_fly_debt = 0.0;
	this.touchZoomDistanceStart = 0;
	this.touchZoomDistanceEnd = 0;
	this.directionalLight = 0;
	this.zoomRate = 50;
	this.rotateRate = 50;
	this.panRate = 100;
	this.pixelHeight = 1;
	let duration = 6000;
  let enabled = true;
	let inbuildTime = 0;
	let cameraPath = undefined;
	let numberOfCameraPoint = undefined;
	let updateLightWithPathFlag = false;
	let playRate = 500;
	let deviceOrientationControl = undefined;
	let defaultViewport = "default";
	let currentMode = MODE.DEFAULT;
	let smoothCameraTransitionObject = undefined;
	let rotateCameraTransitionObject = undefined;
	let cameraAutoTumbleObject = undefined;
	let zoomSize = 0;
  let rotateMode = ROTATE_DIRECTION.FREE;
	this._state = STATE.NONE;
	let zincRayCaster = undefined;
	this.targetTouchId = -1;
  let rect = undefined;
  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const _c = new THREE.Vector3();
  const _new_b = new THREE.Vector3();
  const _new_c = new THREE.Vector3();
  const _axis = new THREE.Vector3();
  const _v = new THREE.Vector3();
  const _rel_eye = new THREE.Vector3();
  const sceneSphere = new THREE.Sphere();
  const _tempEye = new THREE.Vector3();
  let hasUpdated = false;
  let ndcControl = undefined;
  let maxDist = 0;
  const viewports = {
    "default" : new Viewport()
  };
  viewports.default.nearPlane = 0.1;
	viewports.default.farPlane = 2000;
	viewports.default.eyePosition = [0, 0, 0];
	viewports.default.targetPosition = [0, 0, -1.0];
	viewports.default.upVector = [ 0.0, 1.0, 0.0];

  //Add the target property
	if (this.cameraObject.target === undefined)
		this.cameraObject.target = new THREE.Vector3( ...viewports.default.targetPosition );

  //Calculate the max distanc allowed, it is the longer
  //of 6 times the radius of the current scene and
  //the current distance between scene centroid and the postion
  //of the camera.
  this.calculateMaxAllowedDistance = (scene) => {
    const box = scene.getBoundingBox();
    if (box) {
      box.getBoundingSphere(sceneSphere);
      maxDist = sceneSphere.radius * 6;
      let currentDist = 0;
      if (this.cameraObject) {
        currentDist = this.cameraObject.position.distanceTo(sceneSphere.center);
      }
      maxDist = currentDist > maxDist ? currentDist * 1.5: maxDist;
    } else {
      maxDist = 0;
    }
  }

  /**
   * Add a viewport to the list of available named viewports.
   * 
   * @param {String} name - Name of the viewport
   * @param {Viewport} viewportName - Viewport to be added
   */
  this.addViewport = (viewportName, viewport) => {
    if (viewportName && viewport)
      viewports[viewportName] = viewport;
  }

  /**
   * Set the default viewport for this {@link CameraControls}.
   * 
   * @param {String} defaultName - Name of the viewport
   * 
   * @return {Boolean} true if set successfully, false otherwise.
   */
  this.setDefaultViewport = defaultName => {
		if (defaultName && (defaultName in viewports)) {
      defaultViewport = defaultName;
      return true;
    }
    return false
	}

  /**
   * Get the name of the default viewport.
   * 
   * 
   * @return {String}
   */
  this.getDefaultViewport = () => {
		return defaultViewport;
	}
	
  /**
   * Get the viewport with the provied name stored in this object.
   * @param {String} name - Name of the viewport
   * 
   * @return {Viewport}
   */
	this.getViewportOfName = name => {
		return viewports[name];
	}

  /**
   * Set the viewport with a name if it is found in the list.
   * @param {String} name - Name of the viewport
   * 
   * @return {Boolean} if viewport is found and set, otherwise false.
   */
  this.setCurrentViewport = name => {
    if (name in viewports) {
      this.setCurrentCameraSettings(viewports[name])
      return true;
    }
    return false;
	}

  /**
   * Set the direction of rotation allowed with this control.
   * 
   * @param {String} mode - available options are none, horizontal,
   * vertical and free.
   */
  this.setRotationMode = mode => {
    switch (mode) {
      case "none":
        rotateMode = ROTATE_DIRECTION.NONE;
        break;
      case "horizontal":
        rotateMode = ROTATE_DIRECTION.HORIZONTAL;
        break;
      case "vertical":
        rotateMode = ROTATE_DIRECTION.VERTICAL;
        break;
      case "free":
      default:
        rotateMode = ROTATE_DIRECTION.FREE;
    }
  }
	
	this.onResize = () => {
		if (rect)
			rect = undefined;
    if (ndcControl)
      ndcControl.setCurrentCameraSettings(this.cameraObject,
        viewports[defaultViewport]);
	}

	this.getVisibleHeightAtZDepth = ( depth ) => {
		// compensate for cameras not positioned at z=0
		
		const cameraOffset = this.cameraObject.position.distanceTo(this.cameraObject.target);
		if ( depth < cameraOffset ) depth -= cameraOffset;
		else depth += cameraOffset;
	
		// vertical fov in radians
		const vFOV = this.cameraObject.fov * Math.PI / 180; 
	
		// Math.abs to ensure the result is always positive
		return 2 * Math.tan( vFOV / 2 ) * Math.abs( depth );
	};

	this.calculateHeightPerPixelAtZeroDepth = ( wHeight ) => {
		const height = this.getVisibleHeightAtZDepth(0);
		this.pixelHeight = height / wHeight;
		return this.pixelHeight;
	}

  /**
   * Get normalised coordinates from windows coordinates.
   * 
   * @param {String} x
   * @param {String} y
   * @param {THREE.Vector2} positionIn - Optional, write the value into
   * this object if it is provided, otherwise a new object will 
   * be created and returned.
   * 
   * @return {THREE.Vector2} containing the normalised x and y coordinates.
   */
  this.getNDCFromDocumentCoords = (x, y, positionIn) => {
    updateRect(false);
    const position = positionIn ? positionIn : new THREE.Vector2();
    const out_x = ((x - rect.left) / rect.width) * 2 - 1;
    const out_y = -((y - rect.top) / rect.height) * 2 + 1;
    return position.set(out_x, out_y);
  }

  /**
   * Get the relative windows coordinates from normalised coordiantes.
   * 
   * @param {String} x 
   * @param {String} y
   * @param {THREE.Vector2} positionIn - Optional, write the value into
   * this object if it is provided, otherwise a new object will 
   * be created and returned.
   * 
   * @return {THREE.Vector2} containing the relative x and y coordinates.
   */
  this.getRelativeCoordsFromNDC = (x, y, positionIn) => {
    updateRect(false);
    const position = positionIn ? positionIn : new THREE.Vector2();
    position.x = (x + 1) * rect.width / 2.0;
    position.y = (1 - y) * rect.height / 2.0;
    return position;
  }

  /**
   * Map a mouse click to the specified action.
   * 
   * @param {String} buttonName - please see {@link CLICK_ACTION}
   * @param {String} actionName - please see {@link STATE}
   */
	this.setMouseButtonAction = (buttonName, actionName) => {
		CLICK_ACTION[buttonName] = STATE[actionName];
  }

	/**
	 * 
	 * @param {HTML} element 
	 * @param {Number} index 
	 */
	const setCanvasTabindex = (element, index) => {
		if (element instanceof HTMLCanvasElement)
			element.tabIndex = index
	}

  //Make sure the camera does not travel beyond limit
  const checkTravelDistance = () => {
    if (maxDist > 0) {
      const newDist = _tempEye.distanceTo(sceneSphere.center);
      return (maxDist > newDist || 
        this.cameraObject.position.distanceTo(sceneSphere.center) > newDist );
    }
    return true;
  }
  
  const translateViewport = translation => {
    _tempEye.copy(this.cameraObject.position).add(translation);
    if (checkTravelDistance()) {
      this.cameraObject.target.add(translation);
      this.cameraObject.position.add(translation);
      this.updateDirectionalLight();
    }
  }
	
	const onDocumentMouseDown = event => {
    updateRect(false);
    // Check if mouse event hapens inside the minimap
    let minimapCoordinates = undefined;
    if (currentMode === MODE.DEFAULT)
      minimapCoordinates = this.scene.getNormalisedMinimapCoordinates(
        this.renderer, event);
    if (!minimapCoordinates) {
      if (event.button == 0) {
        if (event.ctrlKey)
          this._state = CLICK_ACTION.AUXILIARY;
        else if (event.shiftKey)
          this._state = CLICK_ACTION.SECONDARY;
        else
          this._state = CLICK_ACTION.MAIN;
      } else if (event.button == 1) {
        event.preventDefault();
        this._state = CLICK_ACTION.AUXILIARY;
        } 
        else if (event.button == 2) {
          this._state = CLICK_ACTION.SECONDARY;
        }
      this.pointer_x = event.clientX - rect.left;
      this.pointer_y = event.clientY - rect.top;
      this.pointer_x_start = this.pointer_x;
      this.pointer_y_start = this.pointer_y;
      this.previous_pointer_x = this.pointer_x;
      this.previous_pointer_y= this.pointer_y;
    } else {
      currentMode = MODE.MINIMAP;
      let translation = this.scene.getMinimapDiffFromNormalised(
        minimapCoordinates.x, minimapCoordinates.y);
      translateViewport(translation);
    }
  }

	const onDocumentMouseMove = event => {
    updateRect(false);
		if (rect) {
			this.pointer_x = event.clientX - rect.left;
			this.pointer_y = event.clientY - rect.top;
			if (currentMode === MODE.MINIMAP) {
				let minimapCoordinates = this.scene.getNormalisedMinimapCoordinates(this.renderer, event);
				if (minimapCoordinates) {
					let translation = this.scene.getMinimapDiffFromNormalised(
						minimapCoordinates.x, minimapCoordinates.y);
					translateViewport(translation);
				}
			} else {
				if ((this._state === STATE.NONE) && (zincRayCaster !== undefined)) {
					zincRayCaster.move(this, event.clientX, event.clientY, this.renderer);
				}
			}
		}
	}
	
	const onDocumentMouseUp = event => {
    this._state = STATE.NONE;
    if (currentMode == MODE.MINIMAP)
      currentMode = MODE.DEFAULT;
		if (zincRayCaster !== undefined) {
			if (this.pointer_x_start==(event.clientX - rect.left) && this.pointer_y_start==(event.clientY- rect.top)) {
				zincRayCaster.pick(this, event.clientX, event.clientY, this.renderer);
			}
		}
	}
	
	const onDocumentMouseLeave = event => {
		this._state = STATE.NONE;
	}
	
	const onDocumentTouchStart = event => {
    updateRect(false);
		const len = event.touches.length;
		if (len == 1) {
			this._state = STATE.TOUCH_ROTATE;
			this.pointer_x = event.touches[0].clientX - rect?.left;
			this.pointer_y = event.touches[0].clientY - rect?.top;
			this.pointer_x_start = this.pointer_x;
			this.pointer_y_start = this.pointer_y;
			this.previous_pointer_x = this.pointer_x;
			this.previous_pointer_y= this.pointer_y;
		} else if (len == 2) {
			this._state = STATE.TOUCH_ZOOM;
			const dx = event.touches[ 0 ].clientX - event.touches[ 1 ].clientX;
			const dy = event.touches[ 0 ].clientY - event.touches[ 1 ].clientY;
			this.touchZoomDistanceEnd = this.touchZoomDistanceStart = Math.sqrt( dx * dx + dy * dy );
		} else if (len == 3) {
			this._state = STATE.TOUCH_PAN;
			this.targetTouchId = event.touches[0].identifier;
			this.pointer_x = event.touches[0].clientX - rect?.left;
			this.pointer_y = event.touches[0].clientY - rect?.top;
			this.previous_pointer_x = this.pointer_x;
			this.previous_pointer_y= this.pointer_y;			
		}
	}
	
	const onDocumentTouchMove = event => {
		event.preventDefault();
		event.stopPropagation();
		const len = event.touches.length;
		if (len == 1) {
			this.pointer_x = event.touches[0].clientX - rect.left;
			this.pointer_y = event.touches[0].clientY - rect.top;
		} else if (len == 2) {
			if (this._state === STATE.TOUCH_ZOOM) {
				const dx = event.touches[ 0 ].clientX - event.touches[ 1 ].clientX;
				const dy = event.touches[ 0 ].clientY - event.touches[ 1 ].clientY;
				this.touchZoomDistanceEnd = Math.sqrt( dx * dx + dy * dy );
			}
		} else if (len == 3) {
			if (this._state === STATE.TOUCH_PAN) {
				for (let i = 0; i < 3; i++) {
					if (event.touches[i].identifier == this.targetTouchId) {
						this.pointer_x = event.touches[0].clientX - rect.left;
						this.pointer_y = event.touches[0].clientY - rect.top;
					}
				}
			}				
		}
	}
	
	const onDocumentTouchEnd = event => {
		const len = event.touches.length;
		this.touchZoomDistanceStart = this.touchZoomDistanceEnd = 0;
		this.targetTouchId = -1;
		this._state = STATE.NONE;
		if (len == 1) {
			if (zincRayCaster !== undefined) {
				if (this.pointer_x_start==(event.touches[0].clientX- rect.left) && this.pointer_y_start==(event.touches[0].clientY- rect.top)) {
					zincRayCaster.pick(this.cameraObject, event.touches[0].clientX, event.touches[0].clientY, this.renderer);
				}
			}
		}
	}

  const onDocumentEnter = () => {
		updateRect(true);
	}

  const updateRect = forced => {
    //Use intersectionObserver to reset the rect for ray tracing.
    if (forced || rect === undefined) {
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          rect = entry.boundingClientRect;
        }
        observer.disconnect();
      });
      
      observer.observe(this.domElement);
    }
  }
	
	const onDocumentWheelEvent = event => {
    updateRect(false);
		this._state = STATE.SCROLL;
		let changes = 0;
		if (event.deltaY > 0)
			changes = this.zoomRate;
		else if (event.deltaY < 0)
			changes = this.zoomRate * -1;
		zoomSize = zoomSize + changes;
		event.preventDefault(); 
		event.stopImmediatePropagation();  
	}	

	const onDocumentKeydownEvent = event => {
		updateRect(false);
		let changes = 0;
		if (
			(event.keyCode === KEYBOARD.EQUAL) ||
			(event.keyCode === KEYBOARD.MINUS) ||
			(event.keyCode === KEYBOARD.NUMPADADD) ||
			(event.keyCode === KEYBOARD.NUMPADSUBTRACT)
		) {
			this._state = STATE.KEYBOARD_ZOOM
			let unit = 1;
			if (event.shiftKey) {
				unit = unit * 2
			}
			if (
				(event.keyCode === KEYBOARD.EQUAL) ||
				(event.keyCode === KEYBOARD.NUMPADADD)
			) {
				changes = this.zoomRate * unit * -1;
			} else if (
				(event.keyCode === KEYBOARD.MINUS) ||
				(event.keyCode === KEYBOARD.NUMPADSUBTRACT)
			) {
				changes = this.zoomRate * unit;
			}
			zoomSize = zoomSize + changes;
		} else if (
			(event.keyCode === KEYBOARD.ARROWLEFT) ||
			(event.keyCode === KEYBOARD.ARROWUP) ||
			(event.keyCode === KEYBOARD.ARROWRIGHT) ||
			(event.keyCode === KEYBOARD.ARROWDOWN)
		) {
			if (event.shiftKey) {
				this._state = STATE.KEYBOARD_ROTATE
				this.pointer_x_start = this.pointer_x;
				this.pointer_y_start = this.pointer_y;
				changes = this.rotateRate
			} else {
				this._state = STATE.KEYBOARD_PAN
				changes = this.panRate
			}
			this.previous_pointer_x = this.pointer_x;
			this.previous_pointer_y = this.pointer_y;
			if (event.keyCode === KEYBOARD.ARROWLEFT) {
				this.pointer_x = this.pointer_x - changes;
			} else if (event.keyCode === KEYBOARD.ARROWUP) {
				this.pointer_y = this.pointer_y - changes;
			} else if (event.keyCode === KEYBOARD.ARROWRIGHT) {
				this.pointer_x = this.pointer_x + changes;
			} else if (event.keyCode === KEYBOARD.ARROWDOWN) {
				this.pointer_y = this.pointer_y + changes;
			}
		}
		event.preventDefault();
	}

	const onDocumentKeyupEvent = event => {
		this._state = STATE.NONE;
	}

	const translate = () => {
		if (typeof this.cameraObject !== "undefined")
		{
			const height = rect.height;
			const distance = this.cameraObject.position.distanceTo(this.cameraObject.target);
			let fact = 0.0;
			if ((this.cameraObject.far > this.cameraObject.near) && (distance >= this.cameraObject.near) &&
				(distance <= this.cameraObject.far))
			{
				 fact = (distance-this.cameraObject.near)/(this.cameraObject.far-this.cameraObject.near);
      }
      //_b == old_near, _c = old_far, _new_b = new_near, _new_c = new_far
			_b.set(this.previous_pointer_x,height - this.previous_pointer_y,0.0);
			_c.set(this.previous_pointer_x, height - this.previous_pointer_y,1.0);
			_new_b.set(this.pointer_x,height - this.pointer_y,0.0);
			_new_c.set(this.pointer_x,height - this.pointer_y,1.0);
			_b.unproject(this.cameraObject);
			_c.unproject(this.cameraObject);
			_new_b.unproject(this.cameraObject);
			_new_c.unproject( this.cameraObject);
      const translate_rate = -0.002;
      _new_b.sub(_b).multiplyScalar(1.0-fact);
      _new_c.sub(_c).multiplyScalar(fact);
      _new_b.add(_new_c).multiplyScalar(translate_rate);
      translateViewport(_new_b);
		}
		this.previous_pointer_x = this.pointer_x;
		this.previous_pointer_y = this.pointer_y;
	}

	this.getVectorsFromRotateAboutLookAtPoints = (axis, angle) => {
      axis.normalize();
	    _v.copy(this.cameraObject.position).sub(this.cameraObject.target);
	    _rel_eye.copy(_v);
	    _v.normalize()
	    if (0.8 < Math.abs(_v.dot(axis))) {
	      _v.copy(this.cameraObject.up);
      }
      _b.crossVectors(axis, _v).normalize();
      _c.crossVectors(axis, _b);
	    const rel_eyea = axis.dot(_rel_eye);
	    const rel_eyeb = _b.dot(_rel_eye);
	    const rel_eyec = _c.dot(_rel_eye);
	    const upa = axis.dot(this.cameraObject.up); 
	    const upb = _b.dot(this.cameraObject.up);
	    const upc = _c.dot(this.cameraObject.up);
	    const cos_angle = Math.cos(angle);
	    const sin_angle = Math.sin(angle);
      _new_b.set(cos_angle*_b.x+sin_angle*_c.x,
	                  cos_angle*_b.y+sin_angle*_c.y,
	                  cos_angle*_b.z+sin_angle*_c.z);
	    _new_c.set(cos_angle*_c.x-sin_angle*_b.x,
	                  cos_angle*_c.y-sin_angle*_b.y,
	                  cos_angle*_c.z-sin_angle*_b.z);               
      _v.copy(this.cameraObject.target);
	    _v.x = _v.x + axis.x*rel_eyea + _new_b.x*rel_eyeb+_new_c.x*rel_eyec;
	    _v.y = _v.y + axis.y*rel_eyea + _new_b.y*rel_eyeb+_new_c.y*rel_eyec;
	    _v.z = _v.z + axis.z*rel_eyea + _new_b.z*rel_eyeb+_new_c.z*rel_eyec;
	    _a.set(axis.x*upa+_new_b.x*upb+_new_c.x*upc,
            axis.y*upa+_new_b.y*upb+_new_c.y*upc,
            axis.z*upa+_new_b.z*upb+_new_c.z*upc);
	    return {position: _v, up: _a};
	}
	
	this.alignCameraWithAxis = (axis) => {
		if (axis.length() > 0) {
			_a.copy(axis).normalize();
			_v.copy(this.cameraObject.position).sub(this.cameraObject.target);
			const mag = _v.length();
			_v.x = this.cameraObject.target.x + mag * _a.x;
			_v.y = this.cameraObject.target.y + mag * _a.y;
			_v.z = this.cameraObject.target.z + mag * _a.z;
			this.cameraObject.position.copy(_v);
			this.updateDirectionalLight();
			console.log(_a)
			this.cameraObject.updateProjectionMatrix();
		}
}
	
  /**
   * Rotate around the axis with the amount specified by angle.
   * 
   * @param {THREE.Vector3} axis - The rotational axis.
   * @param {Number} Angle - Specify how much the camera shoudl rotate by.
   */
	this.rotateAboutLookAtpoint = (axis, angle) => {
	  const returned_values = this.getVectorsFromRotateAboutLookAtPoints(axis, angle);
	  this.cameraObject.position.copy(returned_values.position);
	  this.updateDirectionalLight();
	  this.cameraObject.up.copy(returned_values.up);
	}

	const tumble = () => {
		if (typeof this.cameraObject !== "undefined")
		{
			const width = rect?.width;
			const height = rect?.height;
			if ((0<width)&&(0<height))
			{
				const radius=0.25*(width+height);
				let delta_x = 0;
				let delta_y = 0;
        if (rotateMode === ROTATE_DIRECTION.FREE ||
          rotateMode === ROTATE_DIRECTION.HORIZONTAL)
				  delta_x=this.pointer_x-this.previous_pointer_x;
        if (rotateMode === ROTATE_DIRECTION.FREE ||
            rotateMode === ROTATE_DIRECTION.VERTICAL)
				  delta_y=this.previous_pointer_y-this.pointer_y;
				const tangent_dist = Math.sqrt(delta_x*delta_x + delta_y*delta_y);
				if (tangent_dist > 0)
				{
					const dx=-delta_y*1.0/tangent_dist;
					const dy=delta_x*1.0/tangent_dist;
          let d = 0;
          // Do not allow rotation on other direction around the origin if rotateMode is not free
          if (rotateMode === ROTATE_DIRECTION.FREE) {
            let d=dx*(this.pointer_x-0.5*(width-1))+dy*(0.5*(height-1)-this.pointer_y);
            if (d > radius)	{
              d = radius;
            }
            else {
              if (d < -radius) {
                d = -radius;
              }
            }
          }
					const phi=Math.acos(d/radius)-0.5*Math.PI;
					const angle=this.tumble_rate*tangent_dist/radius;
					_a.copy(this.cameraObject.position).sub(this.cameraObject.target).normalize();
					_b.copy(this.cameraObject.up).normalize();
          _c.copy(_b).cross(_a).normalize().multiplyScalar(dx);
          _b.multiplyScalar(dy);
          _axis.addVectors(_c, _b).multiplyScalar(Math.cos(phi));
          _a.multiplyScalar(Math.sin(phi));
          _axis.add(_a);
					this.rotateAboutLookAtpoint(_axis, -angle);
				}
			}
		}
		this.previous_pointer_x = this.pointer_x;
		this.previous_pointer_y = this.pointer_y;
	}
	
	const calculateZoomDelta = () => {
		let delta = 0;
		if (this._state === STATE.ZOOM)
		{
			delta = this.previous_pointer_y-this.pointer_y;
		} else if ((this._state === STATE.SCROLL) || (this._state === STATE.KEYBOARD_ZOOM)) {
			delta = zoomSize;
		} else {
			delta = -1.0 * (this.touchZoomDistanceEnd - this.touchZoomDistanceStart);
			this.touchZoomDistanceStart = this.touchZoomDistanceEnd;
		}
		return delta;
  }

  this.changeZoomByScrollRateUnit = unit => {
    const delta_y = unit * this.zoomRate;
    this.changeZoomByValue(delta_y);
  }

  this.changeZoomByValue = delta_y => {
		if (typeof this.cameraObject !== "undefined")
		{
      const height = rect.height;

			const a = this.cameraObject.position.clone();
			a.sub(this.cameraObject.target);
			const dist = a.length();
			const dy = 1.5 * delta_y/height;
			if ((dist + dy*dist) > 0.01) {
				a.normalize()
        _tempEye.copy(this.cameraObject.position);
				_tempEye.x += a.x*dy*dist;
				_tempEye.y += a.y*dy*dist;
				_tempEye.z += a.z*dy*dist;
        if (checkTravelDistance()) {
          this.cameraObject.position.copy(_tempEye);
          this.updateDirectionalLight();
          const near_far_minimum_ratio = 0.00001;
          if ((near_far_minimum_ratio * this.cameraObject.far) <
            (this.cameraObject.near + dy*dist + this.near_plane_fly_debt)) {
            if (this.near_plane_fly_debt != 0.0)	{
              this.near_plane_fly_debt += dy*dist;
              if (this.near_plane_fly_debt > 0.0) {
                this.cameraObject.near += this.near_plane_fly_debt;
                this.cameraObject.far += this.near_plane_fly_debt;
                this.near_plane_fly_debt = 0.0;
              }
              else {
                this.cameraObject.near += dy*dist;
                this.cameraObject.far += dy*dist;
              }
            }			
          }
          else {
            if (this.near_plane_fly_debt == 0.0) {
              const diff = this.cameraObject.near - near_far_minimum_ratio * this.cameraObject.far;
              this.cameraObject.near = near_far_minimum_ratio * this.cameraObject.far;
              this.cameraObject.far -= diff;
              this.near_plane_fly_debt -= near_far_minimum_ratio * this.cameraObject.far;
            }
            this.near_plane_fly_debt += dy*dist;
          }
          hasUpdated = true;
        }
			}
		}
  }
	
	const flyZoom = () => {
    const delta_y = calculateZoomDelta();
    this.changeZoomByValue(delta_y);
 
		if (this._state === STATE.ZOOM) {
			this.previous_pointer_x = this.pointer_x;
			this.previous_pointer_y = this.pointer_y;
		}
		if ((this._state === STATE.SCROLL) || (this._state === STATE.KEYBOARD_ZOOM)) {
			zoomSize = 0;
      this._state = STATE.NONE;
		}
	}
	
	this.setDirectionalLight = directionalLightIn => {
		this.directionalLight = directionalLightIn;
	};

  /**
   * Force an update to the position of the directional light.
   */
	this.updateDirectionalLight = () => {
		if (this.directionalLight != 0) {
			this.directionalLight.position.set(this.cameraObject.position.x,
					this.cameraObject.position.y,
					this.cameraObject.position.z);
		}
	}
	
	/**
   * Enable the camera control.
   */
	this.enable = function () {
		enabled = true;
		if (this.domElement && this.domElement.addEventListener) {
			setCanvasTabindex(this.domElement, 0)
			this.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
			this.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
			this.domElement.addEventListener( 'mouseup', onDocumentMouseUp, false );
			this.domElement.addEventListener( 'mouseleave', onDocumentMouseLeave, false );
			this.domElement.addEventListener( 'touchstart', onDocumentTouchStart, false);
			this.domElement.addEventListener( 'touchmove', onDocumentTouchMove, false);
			this.domElement.addEventListener( 'touchend', onDocumentTouchEnd, false);
			this.domElement.addEventListener( 'wheel', onDocumentWheelEvent, false);
			this.domElement.addEventListener( 'mouseenter', onDocumentEnter, false );
			this.domElement.addEventListener( 'contextmenu', event => { event.preventDefault(); }, false );
			this.domElement.addEventListener( 'keydown', onDocumentKeydownEvent, false );
			this.domElement.addEventListener( 'keyup', onDocumentKeyupEvent, false );
	  }
	}

  /**
   * Disable the camera control.
   */
	this.disable = function () {
		enabled = false;
		if (this.domElement && this.domElement.removeEventListener) {
			this.domElement.removeEventListener( 'mousedown', onDocumentMouseDown, false );
			this.domElement.removeEventListener( 'mousemove', onDocumentMouseMove, false );
			this.domElement.removeEventListener( 'mouseup', onDocumentMouseUp, false );
			this.domElement.removeEventListener( 'mouseleave', onDocumentMouseLeave, false );
			this.domElement.removeEventListener( 'touchstart', onDocumentTouchStart, false);
			this.domElement.removeEventListener( 'touchmove', onDocumentTouchMove, false);
			this.domElement.removeEventListener( 'touchend', onDocumentTouchEnd, false);
			this.domElement.removeEventListener( 'wheel', onDocumentWheelEvent, false);
			this.domElement.removeEventListener( 'mouseenter', onDocumentEnter, false );
			this.domElement.removeEventListener( 'contextmenu', event => { event.preventDefault(); }, false );
			this.domElement.removeEventListener( 'keydown', onDocumentKeydownEvent, false );
			this.domElement.removeEventListener( 'keyup', onDocumentKeyupEvent, false );
			setCanvasTabindex(this.domElement, -1)
	    }
	}

	this.loadPath = pathData => {
		cameraPath = pathData.CameraPath;
		numberOfCameraPoint = pathData.NumberOfPoints;
	}
	
  /**
   * This is an experimental feature. It loads a path - point to point which
   * the camera will travel.
   * 
   * @param {String} path_url - The path.
   * @param {requestCallback} finishCallback - The callback once the path is load.
   */
	this.loadPathURL = (path_url, finishCallback) => {
		const xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = () => {
		    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
		        const pathData = JSON.parse(xmlhttp.responseText);
		        this.loadPath(pathData);
	          if (finishCallback != undefined && (typeof finishCallback == 'function'))
	            finishCallback();
		    }
		}
		const requestURL = resolveURL(path_url);
		xmlhttp.open("GET", requestURL, true);
		xmlhttp.send();
	}

  /**
   * Set the duration for the camera to travel along the path.
   * 
   * @param {Number} durationIn - the duration for the path.
   */
	this.setPathDuration = durationIn => {
    duration = durationIn;
    if (smoothCameraTransitionObject)
      smoothCameraTransitionObject.setDuration(duration);
    if (rotateCameraTransitionObject)
      rotateCameraTransitionObject.setDuration(duration);
	}
	
  /**
   * Get the playRate - this determines how fast it takes to 
   * finish one duration.
   * 
   * @return {Number}
   */
	 this.getPlayRate = () => {
	    return playRate;
	  }
	
  /**
   * Set the playRate - this determines how fast it takes to 
   * finish one duration.
   * 
   * @param {Number} playRateIn - The play rate speed.
   */
	this.setPlayRate = playRateIn => {
		playRate = playRateIn;
	}

  /**
   * Update the internal timer by the set amount, this can
   * be used to force a time update by setting delta to zero.
   * 
   * @param {Number} delta - The amount of time to increment
   * the time by.
   */
	const updateTime = delta => {
		let targetTime = inbuildTime + delta;
		if (targetTime > duration)
			targetTime = targetTime - duration
		inbuildTime = targetTime;
	};
	
  /**
   * Get the current inbuild time,
   * 
   * @return {Number}
   */
	 this.getTime = () => {
	    return inbuildTime;
	  }
	
  /**
   * Set the current inbuild time,
   * 
   * @param {Number} timeIn - this will be used as the current time,
   * it should be between the range of zero and the set duration.
   */
	this.setTime = timeIn => {
	  if (timeIn > duration)
	    inbuildTime = duration;
	  else if (timeIn < 0.0)
	    inbuildTime = 0.0;
	  else
	    inbuildTime = timeIn;
	}
	
  /**
   * Get the number of frame which is determine by number of points
   * in the camera path.
   * 
   * @return {Number}
   */
	this.getNumberOfTimeFrame = () => {
		return numberOfCameraPoint;
	}

  /**
   * Get the current time frame and it will return three values in
   * an array.
   * 
   * @return {Array} - bottom frame, top frame and the proportion.
   */
	this.getCurrentTimeFrame = () => {
	  if (numberOfCameraPoint > 2) {
  		const current_time = inbuildTime/duration * (numberOfCameraPoint - 1);
  		const bottom_frame =  Math.floor(current_time);
  		const proportion = 1 - (current_time - bottom_frame);
  		const top_frame =  Math.ceil(current_time);
  		if (bottom_frame == top_frame) {
  			if (bottom_frame == numberOfCameraPoint - 1) {
  				return [bottom_frame - 1, top_frame, 0];
  			} else {
  				return [bottom_frame, top_frame + 1, 1.0];
  			}
  		}
  		return [bottom_frame, top_frame, proportion];
	  } else if (numberOfCameraPoint == 1) {
	    return [0, 0, 0];
	  }
	    
	  return undefined;
	}
	
  /**
   * Set the current time frame.
   * 
   * @param {Number} targetTimeFrame - bottom frame, top frame and the proportion.
   */
	this.setCurrentTimeFrame = targetTimeFrame => {
	   if (numberOfCameraPoint > 2) {
  		inbuildTime = duration * targetTimeFrame / (numberOfCameraPoint - 1);
  		if (inbuildTime < 0.0)
  			inbuildTime = 0.0;
  		if (inbuildTime > duration)
  			inbuildTime = duration;
	   }
	}

  /**
   * Update the progress on the path by the specified amount - delta.
   * 
   * @param {Number} delta - The amount of time to increment
   */
	const updatePath = delta => {
		if (currentMode === MODE.PATH) {
			updateTime(delta);
			if (cameraPath) {
				const time_frame = this.getCurrentTimeFrame();
				const bottom_frame = time_frame[0];
				const top_frame = time_frame[1];
				const proportion = time_frame[2];
				const bot_pos = [cameraPath[bottom_frame*3], cameraPath[bottom_frame*3+1], cameraPath[bottom_frame*3+2]];
				const top_pos = [cameraPath[top_frame*3], cameraPath[top_frame*3+1], cameraPath[top_frame*3+2]];
				const current_positions = [];
				for (let i = 0; i < bot_pos.length; i++) {
					current_positions.push(proportion * bot_pos[i] + (1.0 - proportion) * top_pos[i]);
				}
				this.cameraObject.position.set(current_positions[0], current_positions[1], current_positions[2]);
				this.cameraObject.target.set(top_pos[0], top_pos[1], top_pos[2]);
				if (deviceOrientationControl)
					this.cameraObject.lookAt( this.cameraObject.target );
				if (updateLightWithPathFlag) {
					this.directionalLight.position.set(current_positions[0], current_positions[1], current_positions[2]);
					this.directionalLight.target.position.set(top_pos[0], top_pos[1], top_pos[2]);
				}					
			}
		}
	};
	
  /**
   * Force recalculation of the current path.
   */
	this.calculatePathNow = () => {
	  updatePath(0.0);
	}

  // handle synchronised control based on information in the idc
  const handleSyncControl = () => {
    if ((this._state === STATE.ROTATE) || (this._state === STATE.TOUCH_ROTATE) || (this._state === STATE.KEYBOARD_ROTATE)){
      //rotateion does not trigger callback
      tumble();
    } else if ((this._state === STATE.PAN) || (this._state === STATE.TOUCH_PAN) || (this._state === STATE.KEYBOARD_PAN)){
      translate();
      ndcControl.triggerCallback();
    } else if ((this._state === STATE.ZOOM) || (this._state === STATE.TOUCH_ZOOM) || (this._state === STATE.SCROLL) || (this._state === STATE.KEYBOARD_ZOOM)){
      ndcControl.zoom(calculateZoomDelta());
      this.previous_pointer_x = this.pointer_x;
      this.previous_pointer_y = this.pointer_y;
      if ((this._state === STATE.SCROLL) || (this._state === STATE.KEYBOARD_ZOOM)) {
        this._state = STATE.NONE;
      }
      zoomSize = 0;
      ndcControl.triggerCallback();
    }
  }
	
  /**
   * Update all controls related changes - including calculation of the viewport.
   * 
   * @param {Number} timeChanged - Time eclipse since last called.
   */
	this.update = timeChanged => {
		const delta = timeChanged * playRate;
		let controlEnabled = enabled;
		let updated = true;
		if (currentMode === MODE.PATH) {
			updatePath(delta);
		} else if (currentMode === MODE.SMOOTH_CAMERA_TRANSITION && smoothCameraTransitionObject) {
			smoothCameraTransitionObject.update(delta);
			if (smoothCameraTransitionObject.isTransitionCompleted()) {
				smoothCameraTransitionObject == undefined;
				currentMode = MODE.DEFAULT;
			}
			controlEnabled = false;
		} else if (currentMode === MODE.ROTATE_CAMERA_TRANSITION && rotateCameraTransitionObject) {
			rotateCameraTransitionObject.update(delta);
			if (rotateCameraTransitionObject.isTransitionCompleted()) {
				rotateCameraTransitionObject == undefined;
				currentMode = MODE.DEFAULT;
			}
			controlEnabled = false;
		} else if (currentMode === MODE.AUTO_TUMBLE && cameraAutoTumbleObject) {
			cameraAutoTumbleObject.update(delta);
		} else if (currentMode === MODE.SYNC_CONTROL && ndcControl) {
      handleSyncControl();
      controlEnabled = false;
    } else {
			updated = false;
		}
		if (controlEnabled) {
			if (this._state !== STATE.NONE) {
				updated = true;
			}
			if ((this._state === STATE.ROTATE) || (this._state === STATE.TOUCH_ROTATE) || (this._state === STATE.KEYBOARD_ROTATE)){
				tumble();
			} else if ((this._state === STATE.PAN) || (this._state === STATE.TOUCH_PAN) || (this._state === STATE.KEYBOARD_PAN)){
				translate();
			} else if ((this._state === STATE.ZOOM) || (this._state === STATE.TOUCH_ZOOM) || (this._state === STATE.SCROLL) || (this._state === STATE.KEYBOARD_ZOOM)){
				flyZoom();
			}
			if (this._state !== STATE.NONE) {
				if (currentMode === MODE.AUTO_TUMBLE && cameraAutoTumbleObject &&
						cameraAutoTumbleObject.stopOnCameraInput) {
				}
			}
			if (this._state === STATE.SCROLL)
				this._state = STATE.NONE;
		}
		if (deviceOrientationControl) {
			updated = true;
			deviceOrientationControl.update();
			//this.directionalLight.target.position.set(this.cameraObject.target.x, 
			//	this.cameraObject.target.y, this.cameraObject.target.z);
		} else {
			this.cameraObject.lookAt( this.cameraObject.target );
		}

		updated = updated || hasUpdated;
		hasUpdated = false;

		return updated;
	};
	
  /**
   * Switch to path mode and begin traveling through the camera path.
   */
	this.playPath = () => {
		currentMode = MODE.PATH;
	}

  /**
   * Stop playing path and switch back to normal control.
   */
	this.stopPath = () => {
		currentMode = MODE.DEFAULT;
	}
	
  /**
   * Check rather the control is currently in path mode.
   * 
   * @return {Boolean}
   */
	this.isPlayingPath = () => {
		return (currentMode === MODE.PATH);
	}
	
  /**
   * Enable directional light update as the camera
   * is traveling through path.
   * 
   * @param {Boolean} flag
   */
	this.enableDirectionalLightUpdateWithPath = flag => {
		updateLightWithPathFlag = flag;
	}
	
  /**
   * Enable rotation using the devices's accelerometer.
   */
	this.enableDeviceOrientation = () => {
		if (!deviceOrientationControl)
			deviceOrientationControl = new ModifiedDeviceOrientationControls(this.cameraObject);
	}

  /**
   * Disable rotation using the devices's accelerometer.
   */
	this.disableDeviceOrientation = () => {
		if (deviceOrientationControl) {
			deviceOrientationControl.dispose();
			deviceOrientationControl = undefined;
		}
	}

  /**
   * Check rather device orientation based on accelerometer is on.
   */
	this.isDeviceOrientationEnabled = () => {
		if (deviceOrientationControl) {
			return true;
		}
		return false;
	}

  /**
   * Reset the viewport settings to the one provided by default viewport.
   */
	this.resetView = () => {
    const viewport = viewports[defaultViewport];
		this.cameraObject.near = viewport.nearPlane;
		this.cameraObject.far = viewport.farPlane;
		this.cameraObject.position.set( viewport.eyePosition[0], viewport.eyePosition[1],
      viewport.eyePosition[2]);
		this.cameraObject.target.set( viewport.targetPosition[0],
      viewport.targetPosition[1], viewport.targetPosition[2]  );
		this.cameraObject.up.set( viewport.upVector[0],  viewport.upVector[1],
      viewport.upVector[2]);
		this.cameraObject.updateProjectionMatrix();
		this.updateDirectionalLight();
	}

  /**
   * Set the current camera settings with the provided viewport.
   * 
   * @param {Viewport} newViewport - viewport settings.
   */
	this.setCurrentCameraSettings = newViewport => {
		if (newViewport.nearPlane)
			this.cameraObject.near = newViewport.nearPlane;
		if (newViewport.farPlane)
			this.cameraObject.far = newViewport.farPlane;
		if (newViewport.eyePosition)
			this.cameraObject.position.set( newViewport.eyePosition[0], 
					newViewport.eyePosition[1], newViewport.eyePosition[2]);
		if (newViewport.targetPosition)
			this.cameraObject.target.set( newViewport.targetPosition[0],
					newViewport.targetPosition[1], newViewport.targetPosition[2]  );
		if (newViewport.upVector)
			this.cameraObject.up.set( newViewport.upVector[0], newViewport.upVector[1],
					newViewport.upVector[2]);
		this.cameraObject.updateProjectionMatrix();
		this.updateDirectionalLight();
		hasUpdated = true;
	}

  /**
   * Get the viewport based on centre, radius, view_angle and clip distance.
   * 
   * @param {Number} centreX - x coordinate of the centre.
   * @param {Number} centreY - y coordinate of the centre.
   * @param {Number} centreZ - z coordinate of the centre.
   * @param {Number} radius - radius if the viewport.
   * @param {Number} view_angle - view angle.
   * @param {Number} clip_distance - clip_distance between the near and far plane.
   * 
   * @return {Viewport}
   */	
	this.getViewportFromCentreAndRadius = (centreX, centreY, centreZ, radius, view_angle, clip_distance) => {
		let eyex = this.cameraObject.position.x-this.cameraObject.target.x;
		let eyey = this.cameraObject.position.y-this.cameraObject.target.y;
		let eyez = this.cameraObject.position.z-this.cameraObject.target.z;
		const fact = 1.0/Math.sqrt(eyex*eyex+eyey*eyey+eyez*eyez);
		eyex = eyex * fact;
		eyey = eyey * fact;
		eyez = eyez * fact;
		/* look at the centre of the sphere */
		const localTargetPosition = [centreX, centreY, centreZ];
		/* shift the eye position to achieve the desired view_angle */
		const eye_distance = radius/Math.tan(view_angle*Math.PI/360.0);
		const localEyePosition = [ centreX + eyex*eye_distance,  centreY + eyey*eye_distance,
		                    centreZ + eyez*eye_distance];
		const localFarPlane = eye_distance+clip_distance;
		let localNearPlane = 0.0;
		const nearClippingFactor = 0.95;
		if (clip_distance > nearClippingFactor*eye_distance)
		{
			localNearPlane = (1.0 - nearClippingFactor)*eye_distance;
		}
		else
		{
			localNearPlane = eye_distance - clip_distance;
		}
		const newViewport = new Viewport();
		newViewport.nearPlane = localNearPlane;
		newViewport.farPlane = localFarPlane;
		newViewport.eyePosition = localEyePosition;
		newViewport.targetPosition = localTargetPosition;
		newViewport.upVector = [this.cameraObject.up.x, this.cameraObject.up.y,
		                        this.cameraObject.up.z];
		
		return newViewport;
	}

	  /**
   * Get the viewport for the boudning box
   * 
   * @param {Number} boundingBox - y coordinate of the centre.
   * @return {Viewport}
   */	
	this.getViewportFromBoundingBox = (boundingBox, radiusScale) => {
		const radius = boundingBox.min.distanceTo(boundingBox.max) / 2.0 * radiusScale;
		const centreX = (boundingBox.min.x + boundingBox.max.x) / 2.0;
		const centreY = (boundingBox.min.y + boundingBox.max.y) / 2.0;
		const centreZ = (boundingBox.min.z + boundingBox.max.z) / 2.0;
		const clip_factor = 4.0;
		const viewport = this.getViewportFromCentreAndRadius(
			centreX, centreY, centreZ, radius, 40, radius * clip_factor);
		return viewport;
	}

  /**
   * Get the current camera viewport.
   * 
   * @return {Viewport}
   */
	this.getCurrentViewport = () => {
		const currentViewport = new Viewport();
		currentViewport.nearPlane = this.cameraObject.near;
		currentViewport.farPlane = this.cameraObject.far;
		currentViewport.eyePosition[0] = this.cameraObject.position.x;
		currentViewport.eyePosition[1] = this.cameraObject.position.y;
		currentViewport.eyePosition[2] = this.cameraObject.position.z;
		currentViewport.targetPosition[0] = this.cameraObject.target.x;
		currentViewport.targetPosition[1] = this.cameraObject.target.y;
		currentViewport.targetPosition[2] = this.cameraObject.target.z;
		currentViewport.upVector[0] = this.cameraObject.up.x;
		currentViewport.upVector[1] = this.cameraObject.up.y;
		currentViewport.upVector[2] = this.cameraObject.up.z;
		return currentViewport;
	}
	
	this.getDefaultEyePosition = () => {
		return eyePosition;
	}
	
	this.getDefaultTargetPosition = () => {
		return targetPosition;
	}

  /**
   * Setup a smooth transition object which transition the camera from one 
   * viewport to the other in the specified duration. This will not work if 
   * {@link rotateCameraTransition} is active.
   * To use this object, the transition must be enabled using
   * {@link enableCameraTransition}.
   * 
   * @param {Viewport} startingViewport - the starting viewport
   * @param {Viewport} endingViewport - the viewport ti end the transistion with.
   * @param {Number} durationIn - duration of the smooth transition.
   */
	this.cameraTransition = (startingViewport, endingViewport, durationIn) => {
	  if (rotateCameraTransitionObject == undefined)
	    smoothCameraTransitionObject = new SmoothCameraTransition(startingViewport, endingViewport,
	        this, durationIn);
	}

  /**
   * Setup a rotate camera transition object which rotate the 
   * camera by the specified the angle in the specified 
   * duration. This will not work if {@link cameraTransition}
   * is active.
   * To use this object, the transition must be enabled using
   * {@link enableCameraTransition}.
   * 
   * @param {THREE.Vector3} axis - the starting viewport
   * @param {Number} angle - the viewport ti end the transistion with.
   * @param {Number} duration - duration of the smooth transition.
   */
	this.rotateCameraTransition = (axis, angle, duration) => {
	  if (smoothCameraTransitionObject == undefined)
	    rotateCameraTransitionObject = new RotateCameraTransition(axis, angle,
	      this, duration);
	}

  /**
   * Enable camera transition, {@link rotateCameraTransition} amd
   * {@link cameraTransition} must be called before camera transition can
   * be enabled.
   */
	this.enableCameraTransition = () => {
	  if (smoothCameraTransitionObject)
	    currentMode = MODE.SMOOTH_CAMERA_TRANSITION;
	  if (rotateCameraTransitionObject)
	    currentMode = MODE.ROTATE_CAMERA_TRANSITION;
	}

  /**
   * Pause the camera transition.
   */
	this.pauseCameraTransition = () => {
		currentMode = MODE.DEFAULT;
	}

  /**
   * Stop the camera transition and remove camera transition
   * and rotate camera transition.
   */
	this.stopCameraTransition = () => {
		currentMode = MODE.DEFAULT;
		smoothCameraTransitionObject = undefined;
		rotateCameraTransitionObject = undefined;
	}

  /**
   * Check if camera transition is active.
   */
	this.isTransitioningCamera = () => {
		return (currentMode === MODE.SMOOTH_CAMERA_TRANSITION ||
		    currentMode === MODE.ROTATE_CAMERA_TRANSITION);
	}
  
  /**
   * Setup auto tumble object of the camera which will rotate the camera
   * around the target as if the user is rotating the camera by mouse/touch
   * interaction.
   * The tumbling will only be enabled with {@link enabelAutoTumble}. 
   * 
   * @param {Array} tumbleDirectionIn - direction of the mouse/touch.
   * @param {Number} tumbleRateIn - Speed of the tumbling.
   * @param {Boolean} stopOnCameraInputIn - Disable the tumbling once the user
   * start interacting with the scene.
   */
	this.autoTumble = (tumbleDirectionIn, tumbleRateIn, stopOnCameraInputIn) => {
		cameraAutoTumbleObject = new CameraAutoTumble(tumbleDirectionIn, tumbleRateIn, stopOnCameraInputIn, this);
	}

  /**
   * Enable autotumble.
   */
	this.enableAutoTumble = () => {
		currentMode = MODE.AUTO_TUMBLE;
	}

  /**
   * Disable the autotumble.
   */
	this.stopAutoTumble = () => {
		currentMode = MODE.DEFAULT;
		cameraAutoTumbleObject = undefined;
	}

  /**
   * Update the autotumble object.
   */
	this.updateAutoTumble = () => {
		if (cameraAutoTumbleObject)
			cameraAutoTumbleObject.requireUpdate = true;
	}

  /**
   * Check rather autotumble is active.
   * 
   * @return {Boolean}
   */
	this.isAutoTumble = () => {
		return (currentMode === MODE.AUTO_TUMBLE);
	}
	
  /**
   * Create an internal raycaster object and enable it for picking.
   * 
   * @param {Scene} sceneIn - The scene to pick from, it can be different from the
   * camera's scene.
   * @param {requestCallback} callbackFunctionIn - The callback for pick event.
   * @param {requestCallback} hoverCallbackFunctionIn - The callback for hover
   * over event.
   */
  this.enableRaycaster = (sceneIn, callbackFunctionIn, hoverCallbackFunctionIn) => {
    if (zincRayCaster == undefined)
      zincRayCaster = new RayCaster(sceneIn, this.scene, callbackFunctionIn, hoverCallbackFunctionIn, this.renderer);
  }

  /**
   * Disable raycaster and remove the internal ray caster object.
   */
  this.disableRaycaster = () => {
    zincRayCaster.disable();
    zincRayCaster = undefined;
  }

  /**
   * Check rather the camera is in syncControl mode.
   * 
   * @return {Boolean}
   */
  this.isSyncControl = () => {
    return currentMpde === MODE.SYNC_CONTROL;
  }

  /**
   * Enable syncControl.
   */
  this.enableSyncControl = () => {
    currentMode = MODE.SYNC_CONTROL;
    if (!ndcControl)
      ndcControl = new NDCCameraControl();
    ndcControl.setCurrentCameraSettings(this.cameraObject,
      viewports[defaultViewport]);
    return ndcControl;
  }

  /**
   * Disable syncControl.
   */
  this.disableSyncControl = () => {
    currentMode = MODE.DEFAULT;
    this.cameraObject.zoom = 1;
    this.cameraObject.updateProjectionMatrix();
  }
	
	this.enable();

};

const SmoothCameraTransition = function(startingViewport, endingViewport, targetCameraIn, durationIn) {
	const startingEyePosition = startingViewport.eyePosition;
	const startingTargetPosition = startingViewport.targetPosition;
	const startingUp = startingViewport.upVector;
	const endingEyePosition = endingViewport.eyePosition;
	const endingTargetPosition = endingViewport.targetPosition;
	const endingUp = endingViewport.upVector;
	const targetCamera = targetCameraIn;
	let duration = durationIn;
	let inbuildTime = 0;
	const enabled = true;
	const updateLightWithPathFlag = true;
	let completed = false;
	targetCamera.near = Math.min(startingViewport.nearPlane, endingViewport.nearPlane);
	targetCamera.far = Math.max(startingViewport.farPlane, endingViewport.farPlane);
	targetCamera.cameraObject.up.set( endingViewport.upVector[0],  endingViewport.upVector[1],
      endingViewport.upVector[2]);
      
  this.setDuration = newDuration => {
    duration = newDuration;
  }
	
	const updateTime = delta => {
		let targetTime = inbuildTime + delta;
		if (targetTime > duration)
			targetTime = duration;
		inbuildTime = targetTime;
	};
	
	const updateCameraSettings = () => {
		const ratio = inbuildTime / duration;
		const eyePosition = [startingEyePosition[0] * (1.0 - ratio) + endingEyePosition[0] * ratio,
		                   startingEyePosition[1] * (1.0 - ratio) + endingEyePosition[1] * ratio,
		                   startingEyePosition[2] * (1.0 - ratio) + endingEyePosition[2] * ratio];
		const targetPosition = [startingTargetPosition[0] * (1.0 - ratio) + endingTargetPosition[0] * ratio,
		                      startingTargetPosition[1] * (1.0 - ratio) + endingTargetPosition[1] * ratio,
		                      startingTargetPosition[2] * (1.0 - ratio) + endingTargetPosition[2] * ratio];
    const upVector = [startingUp[0] * (1.0 - ratio) + endingUp[0] * ratio,
      startingUp[1] * (1.0 - ratio) + endingUp[1] * ratio,
      startingUp[2] * (1.0 - ratio) + endingUp[2] * ratio];
		targetCamera.cameraObject.position.set( eyePosition[0], eyePosition[1], eyePosition[2]);
		targetCamera.cameraObject.target.set( targetPosition[0], targetPosition[1], targetPosition[2]  );
	};
	
	this.update = delta => {

		if ( this.enabled === false ) return;
		
		updateTime(delta);
		
		updateCameraSettings();
		
		if (inbuildTime == duration) {
			completed = true;
		}

	}
	
	this.isTransitionCompleted = () => {
		return completed;
	}
	
};

const RotateCameraTransition = function(axisIn, angleIn, targetCameraIn, durationIn) {
  const axis = axisIn;
  const angle = angleIn;
  const targetCamera = targetCameraIn;
  let duration = durationIn;
  let inbuildTime = 0;
  const enabled = true;
  const ratio = inbuildTime / duration;
  let completed = false;

  this.setDuration = newDuration => {
    duration = newDuration;
  }

  const updateCameraSettings = delta => {
    const previousTime = inbuildTime;
    let targetTime = inbuildTime + delta;
    if (targetTime > duration)
      targetTime = duration;
    inbuildTime = targetTime;
    const actualDelta = inbuildTime - previousTime;
    const ratio = actualDelta / duration;
    const alpha = ratio * angle;
    targetCamera.rotateAboutLookAtpoint(axis, alpha);
  };
  
  this.update = delta => {

    if ( this.enabled === false ) return;
    
    updateCameraSettings(delta);
    
    if (inbuildTime == duration) {
      completed = true;
    }

  }
  
  this.isTransitionCompleted = () => {
    return completed;
  }
}

const RayCaster = function (sceneIn, hostSceneIn, callbackFunctionIn, hoverCallbackFunctionIn, rendererIn) {
  const scene = sceneIn;
  const hostScene = hostSceneIn;
	const renderer = rendererIn;
	const callbackFunction = callbackFunctionIn;
	const hoverCallbackFunction = hoverCallbackFunctionIn;
	const enabled = true;
	const raycaster = new THREE.Raycaster();
	raycaster.params.Line.threshold = 0.1;
	raycaster.params.Points.threshold = 1;
  const mouse = new THREE.Vector2();
  let awaiting = false;
  let lastHoveredDate = new Date();
  let lastHoveredEmpty = false;
  let timeDiff = 0;
  let pickedObjects = new Array();
  let lastPosition = { zincCamera: undefined, x: -1 ,y: -1};
	let pickableObjects = undefined;

	this.enable = () => {
		enable = true;
	}

	this.disable = () => {
		enable = false;
	}

	this.getIntersectsObject = (zincCamera) => {
    if (hostScene !== scene) {
      const threejsScene = scene.getThreeJSScene();
      renderer.render(threejsScene, zincCamera.cameraObject);
    }
    let objects = pickableObjects ? pickableObjects : scene.getPickableThreeJSObjects();
    //Reset pickedObjects array 
    pickedObjects.length = 0;
		return raycaster.intersectObjects( objects, true, pickedObjects );
	}

	this.setPickableObjects = (zincObjects) => {
		if (zincObjects === undefined) {
			pickableObjects = undefined;
		} else {
			pickableObjects = [];
			zincObjects.forEach(zincObject => {
				if (zincObject.getGroup() && zincObject.getGroup().visible) {
					pickableObjects.push(zincObject.getGroup());
				}
			});
		}
	}

	this.getIntersectsObjectWithOrigin = (zincCamera, origin, direction) => {
		raycaster.set(origin, direction);
		return this.getIntersectsObject(zincCamera);
	}

	this.getIntersectsObjectWithCamera = (zincCamera, x, y) => {
    zincCamera.getNDCFromDocumentCoords(x, y, mouse);
		raycaster.setFromCamera(mouse, zincCamera.cameraObject);
		return this.getIntersectsObject(zincCamera);
	};
	
	this.pick = (zincCamera, x, y) => { 
		if (enabled && renderer && scene && zincCamera && callbackFunction) {
			this.getIntersectsObjectWithCamera(zincCamera, x, y);
			const length = pickedObjects.length;
			for (let i = 0; i < length; i++) {
				let zincObject = pickedObjects[i].object ? pickedObjects[i].object.userData : undefined;
				if (zincObject && zincObject.isMarkerCluster && zincObject.visible
					&& zincObject.clusterIsVisible(pickedObjects[i].object.clusterIndex)) {
					//Can zoom into cluster
					if (zincObject.zoomToCluster(pickedObjects[i].object.clusterIndex)) {
						return;
					}
				}
			}
			callbackFunction(pickedObjects, x, y);
		}
  }
  
  let hovered = (zincCamera, x, y) => {
    if (enabled && renderer && scene && zincCamera && hoverCallbackFunction) {
      this.getIntersectsObjectWithCamera(zincCamera, x, y);
      lastHoveredDate.setTime(Date.now());
      if (pickedObjects.length === 0) {
        //skip hovered callback if the previous one is empty
        if (lastHoveredEmpty)
          return
        lastHoveredEmpty = true;
      } else {
        lastHoveredEmpty = false;
      }
      hoverCallbackFunction(pickedObjects, x, y);
    }
  }
	
	this.move = (zincCamera, x, y) => {
    if (enabled && renderer && scene && zincCamera && hoverCallbackFunction) {
      if (scene.displayMarkers) {
        hovered(zincCamera, x, y);
      } else {
        lastPosition.zincCamera = zincCamera;
        lastPosition.x = x;
        lastPosition.y = y;
        if (!awaiting) {
          timeDiff = lastHoveredDate ? Date.now() - lastHoveredDate.getTime() : 250;
          if (timeDiff >= 250) {
            hovered(zincCamera, x, y);
          } else {
            awaiting = true;
            setTimeout(awaitMove(lastPosition), timeDiff);
          }
        }
      }
    }
  }
  
  let awaitMove = (lastPosition) => {
    return function() {
      awaiting = false;
      hovered(lastPosition.zincCamera, lastPosition.x, lastPosition.y);
    }
  }
};

const CameraAutoTumble = function (tumbleDirectionIn, tumbleRateIn, stopOnCameraInputIn, targetCameraIn) {
	const tumbleAxis = new THREE.Vector3();
	const angle = -tumbleRateIn;
	const targetCamera = targetCameraIn;
	const enabled = true;
	const updateLightWithPathFlag = true;
	const tumbleDirection = tumbleDirectionIn;
	this.stopOnCameraInput = stopOnCameraInputIn;
  this.requireUpdate = true;
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
	
	const computeTumbleAxisAngle = tumbleDirection => {
		const tangent_dist = Math.sqrt(tumbleDirection[0]*tumbleDirection[0] +
			tumbleDirection[1]*tumbleDirection[1]);
		const width = Math.abs(tumbleDirection[0]) * 4.0;
		const height = Math.abs(tumbleDirection[1]) * 4.0;
		const radius = 0.25 * (width + height);
		const dx = -tumbleDirection[1]/tangent_dist;
		const dy = tumbleDirection[0]/tangent_dist;
		let d = dx*(tumbleDirection[0])+dy*(-tumbleDirection[1]);
		
		if (d > radius)
		{
			d = radius;
		}
		else
		{
			if (d < -radius)
			{
				d = -radius;
			}
		}
		
		const phi=Math.acos(d/radius)-0.5*Math.PI;
		/* get axis to rotate about */
		tumbleAxis.copy(targetCamera.cameraObject.position).sub(
      targetCamera.cameraObject.target).normalize();
		b.copy(targetCamera.cameraObject.up).normalize();
    c.crossVectors(b, tumbleAxis).normalize().multiplyScalar(dx);
    b.multiplyScalar(dy);
    b.add(c).multiplyScalar(Math.cos(phi));
    tumbleAxis.multiplyScalar(Math.sin(phi)).add(b);
	};
		
	this.update = delta => {

		if ( this.enabled === false ) return;
		
		if (this.requireUpdate) {
			computeTumbleAxisAngle(tumbleDirection);
			this.requireUpdate = false;
		}
		targetCamera.rotateAboutLookAtpoint(tumbleAxis, angle * delta/1000);

	}
	
};

/**
 * @author mrdoob / http://mrdoob.com/
 */
const StereoCameraZoomFixed = function () {

	this.type = 'StereoCamera';

	this.aspect = 1;

	this.cameraL = new THREE.PerspectiveCamera();
	this.cameraL.layers.enable( 1 );
	this.cameraL.matrixAutoUpdate = false;

	this.cameraR = new THREE.PerspectiveCamera();
	this.cameraR.layers.enable( 2 );
	this.cameraR.matrixAutoUpdate = false;

};

Object.assign( StereoCameraZoomFixed.prototype, {

	update: (() => {

		let focus, fov, aspect, near, far, zoom;

		const eyeRight = new THREE.Matrix4();
		const eyeLeft = new THREE.Matrix4();

		return function update( camera ) {

			const needsUpdate = focus !== camera.focus || fov !== camera.fov ||
												aspect !== camera.aspect * this.aspect || near !== camera.near ||
												far !== camera.far || zoom !== camera.zoom;

			if ( needsUpdate ) {

				focus = camera.focus;
				fov = camera.fov;
				aspect = camera.aspect * this.aspect;
				near = camera.near;
				far = camera.far;
				zoom = camera.zoom;

				// Off-axis stereoscopic effect based on
				// http://paulbourke.net/stereographics/stereorender/

				const projectionMatrix = camera.projectionMatrix.clone();
				const eyeSep = 0.064 / 2;
				const eyeSepOnProjection = eyeSep * near / focus;
				const ymax = near * Math.tan( THREE.Math.DEG2RAD * fov * 0.5 ) / camera.zoom;
				let xmin, xmax;

				// translate xOffset

				eyeLeft.elements[ 12 ] = - eyeSep;
				eyeRight.elements[ 12 ] = eyeSep;

				// for left eye

				xmin = - ymax * aspect + eyeSepOnProjection;
				xmax = ymax * aspect + eyeSepOnProjection;

				projectionMatrix.elements[ 0 ] = 2 * near / ( xmax - xmin );
				projectionMatrix.elements[ 8 ] = ( xmax + xmin ) / ( xmax - xmin );

				this.cameraL.projectionMatrix.copy( projectionMatrix );

				// for right eye

				xmin = - ymax * aspect - eyeSepOnProjection;
				xmax = ymax * aspect - eyeSepOnProjection;

				projectionMatrix.elements[ 0 ] = 2 * near / ( xmax - xmin );
				projectionMatrix.elements[ 8 ] = ( xmax + xmin ) / ( xmax - xmin );

				this.cameraR.projectionMatrix.copy( projectionMatrix );

			}

			this.cameraL.matrixWorld.copy( camera.matrixWorld ).multiply( eyeLeft );
			this.cameraR.matrixWorld.copy( camera.matrixWorld ).multiply( eyeRight );

		};

	})()

} );

/** the following StereoEffect is written by third party */
/**
 * @author alteredq / http://alteredqualia.com/
 * @authod mrdoob / http://mrdoob.com/
 * @authod arodic / http://aleksandarrodic.com/
 * @authod fonserbc / http://fonserbc.github.io/
*/
const StereoEffect = function ( renderer ) {

	const _stereo = new StereoCameraZoomFixed();
	_stereo.aspect = 0.5;

	this.setSize = (width, height) => {

		renderer.setSize( width, height );

	};

	this.render = (scene, camera) => {

		scene.updateMatrixWorld();

		if ( camera.parent === null ) camera.updateMatrixWorld();

		_stereo.update( camera );

		const size = renderer.getSize();

		renderer.setScissorTest( true );
		renderer.clear();

		renderer.setScissor( 0, 0, size.width / 2, size.height );
		renderer.setViewport( 0, 0, size.width / 2, size.height );
		renderer.render( scene, _stereo.cameraL );

		renderer.setScissor( size.width / 2, 0, size.width / 2, size.height );
		renderer.setViewport( size.width / 2, 0, size.width / 2, size.height );
		renderer.render( scene, _stereo.cameraR );

		renderer.setScissorTest( false );

	};

};


/**
 * @author richt / http://richt.me
 * @author WestLangley / http://github.com/WestLangley
 *
 * W3C Device Orientation control (http://w3c.github.io/deviceorientation/spec-source-orientation.html)
 */

const ModifiedDeviceOrientationControls = function ( object ) {

	const scope = this;

	this.object = object; 
	this.object.rotation.reorder( "YXZ" );

	this.enabled = true;

	this.deviceOrientation = {};
	this.screenOrientation = 0;

	const onDeviceOrientationChangeEvent = event => {

		scope.deviceOrientation = event;

	};

	const onScreenOrientationChangeEvent = () => {
	  if (typeof(window) !== 'undefined')
	    scope.screenOrientation = window.orientation || 0;

	};

	// The angles alpha, beta and gamma form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''

	const setObjectQuaternion = (() => {

		const zee = new THREE.Vector3( 0, 0, 1 );

		const euler = new THREE.Euler();

		const q0 = new THREE.Quaternion();

		const q1 = new THREE.Quaternion( - Math.sqrt( 0.5 ), 0, 0, Math.sqrt( 0.5 ) ); // - PI/2 around the x-axis

		return (cameraObject, alpha, beta, gamma, orient) => {
			
			const vector = new THREE.Vector3(0, 0, 1);
			
			vector.subVectors(cameraObject.target, cameraObject.position);

			euler.set( beta, alpha, - gamma, 'YXZ' );                       // 'ZXY' for the device, but 'YXZ' for us

			const quaternion = new THREE.Quaternion();
			
			quaternion.setFromEuler( euler );                               // orient the device

			quaternion.multiply( q1 );                                      // camera looks out the back of the device, not the top

			quaternion.multiply( q0.setFromAxisAngle( zee, - orient ) );    // adjust for screen orientation
			
			vector.applyQuaternion(quaternion);
				
			vector.addVectors(cameraObject.position, vector);
			
			cameraObject.lookAt(vector);

		};

	})();

	this.connect = () => {

		onScreenOrientationChangeEvent(); // run once on load
		if (typeof(window) !== 'undefined') {
		  window.addEventListener( 'orientationchange', onScreenOrientationChangeEvent, false );
		  window.addEventListener( 'deviceorientation', onDeviceOrientationChangeEvent, false );
		}
		scope.enabled = true;

	};

	this.disconnect = () => {
	  if (typeof(window) !== 'undefined') {
	    window.removeEventListener( 'orientationchange', onScreenOrientationChangeEvent, false );
		  window.removeEventListener( 'deviceorientation', onDeviceOrientationChangeEvent, false );
	  }
		scope.enabled = false;

	};

	this.update = () => {

		if ( scope.enabled === false ) return;

		const alpha  = scope.deviceOrientation.alpha ? THREE.Math.degToRad( scope.deviceOrientation.alpha ) : 0; // Z
		const beta   = scope.deviceOrientation.beta  ? THREE.Math.degToRad( scope.deviceOrientation.beta  ) : 0; // X'
		const gamma  = scope.deviceOrientation.gamma ? THREE.Math.degToRad( scope.deviceOrientation.gamma ) : 0; // Y''
		const orient = scope.screenOrientation       ? THREE.Math.degToRad( scope.screenOrientation       ) : 0; // O

		setObjectQuaternion( scope.object, alpha, beta, gamma, orient );

	};

	this.dispose = function () {

		this.disconnect();

	};

	this.connect();

};

const NDCCameraControl = function () {
	let camera = undefined;
  let targetCamera = undefined;
  let defaultViewport = undefined;
  const position = new THREE.Vector3();
  const target = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  let eventCallback = undefined;

  this.setCurrentCameraSettings = (cameraIn, defaultViewportIn)  => {
    camera = cameraIn.clone();
    targetCamera = cameraIn;
    defaultViewport = defaultViewportIn;
    camera.near = defaultViewport.nearPlane;
    if (defaultViewport.farPlane)
      camera.far = defaultViewport.farPlane;
    if (defaultViewport.eyePosition)
      camera.position.set(defaultViewport.eyePosition[0],
        defaultViewport.eyePosition[1], defaultViewport.eyePosition[2]);
    if (defaultViewport.upVector)
      camera.up.set(defaultViewport.upVector[0], defaultViewport.upVector[1],
        defaultViewport.upVector[2]);
    if (defaultViewport.targetPosition) {
      camera.target = new THREE.Vector3(defaultViewport.targetPosition[0],
        defaultViewport.targetPosition[1], defaultViewport.targetPosition[2]);
      camera.lookAt(camera.target);
    }
    camera.updateProjectionMatrix();
    position.copy(camera.position).project(camera);
    target.copy(camera.target).project(camera);
  }
	
  this.getCurrentPosition = () => {
    target.copy(targetCamera.target).project(camera);
    return [target.x, target.y];
  }

  this.zoom = delta => {
    let scaledDelta = delta * 0.002;
    let zoom = Math.max(targetCamera.zoom - scaledDelta, 1.0);
    targetCamera.zoom = zoom;
    targetCamera.updateProjectionMatrix();
  }

  this.zoomToBox = (box, zoom) => {
    box.getCenter(v1);
    v1.project(camera);
    this.setCenterZoom([v1.x, v1.y], zoom);
  }
	  
  //return top left and size
  this.getPanZoom = () => {
    return {target: this.getCurrentPosition(), zoom: targetCamera.zoom };
  }

  this.setCenterZoom = (center, zoom) => {
    v1.set(center[0], center[1], target.z).unproject(camera);
    v2.copy(v1).sub(targetCamera.target);
    targetCamera.target.copy(v1);
    targetCamera.lookAt(targetCamera.target);
    targetCamera.position.add(v2);
    targetCamera.zoom = zoom;
    targetCamera.updateProjectionMatrix();
  }

  this.setEventCallback = (callback) => {
    if (callback === undefined || (typeof callback == 'function'))
      eventCallback = callback;
  }

  this.triggerCallback = () => {
    if (eventCallback !== undefined && (typeof eventCallback == 'function'))
      eventCallback();
  }
};

exports.Viewport = Viewport
exports.CameraControls = CameraControls
exports.SmoothCameraTransition = SmoothCameraTransition
exports.RotateCameraTransition = RotateCameraTransition
exports.RayCaster = RayCaster
exports.CameraAutoTumble = CameraAutoTumble
exports.StereoEffect = StereoEffect
exports.NDCCameraControl = NDCCameraControl
