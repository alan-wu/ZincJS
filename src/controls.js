const THREE = require('three');
const resolveURL = require('./utilities').resolveURL;

const Viewport = function () {
	this.nearPlane = 0.1;
	this.farPlane = 2000.0;
	this.eyePosition = [0.0, 0.0, 0.0];
	this.targetPosition = [0.0, 0.0, 0.0];
	this.upVector = [ 0.0, 1.0, 0.0];
	const _this = this;
};

const CameraControls = function ( object, domElement, renderer, scene ) {
	const MODE = { NONE: -1, DEFAULT: 0, PATH: 1, SMOOTH_CAMERA_TRANSITION: 2, AUTO_TUMBLE: 3, ROTATE_TRANSITION: 4 };
	const STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM: 4, TOUCH_PAN: 5, SCROLL: 6 };
	const CLICK_ACTION = {};
	CLICK_ACTION.MAIN = STATE.ROTATE;
	CLICK_ACTION.AUXILIARY = STATE.PAN;
	CLICK_ACTION.SECONDARY = STATE.ZOOM;
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
	this.scrollRate = 50;
	let duration = 3000;
	let inbuildTime = 0;
	let cameraPath = undefined;
	let numberOfCameraPoint = undefined;
	let updateLightWithPathFlag = false;
	let playRate = 500;
	let deviceOrientationControl = undefined;
	const defaultViewport = new Viewport();
	let currentMode = MODE.DEFAULT;
	let smoothCameraTransitionObject = undefined;
	let rotateCameraTransitionObject = undefined;
	let cameraAutoTumbleObject = undefined;
	let mouseScroll = 0;
	this._state = STATE.NONE;
	let zincRayCaster = undefined;
	this.targetTouchId = -1;
	let rect = undefined;
	if (this.cameraObject.target === undefined)
		this.cameraObject.target = new THREE.Vector3( 0, 0, 0  );
	
	this.onResize = () => {
		if (rect)
			rect = undefined;
	}
	
	this.setMouseButtonAction = (buttonName, actionName) => {
		CLICK_ACTION[buttonName] = STATE[actionName];
	}
	
	const onDocumentMouseDown = event => {
		if (rect === undefined)
			rect = this.domElement.getBoundingClientRect();
		if (event.button == 0) { 
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
	}

	const onDocumentMouseMove = event => {
		if (rect === undefined)
			rect = this.domElement.getBoundingClientRect();
		this.pointer_x = event.clientX - rect.left;
		this.pointer_y = event.clientY - rect.top;
		
		if (zincRayCaster !== undefined) {
			zincRayCaster.move(this, event.clientX, event.clientY, this.renderer);
		}
	}
	
	const onDocumentMouseUp = event => {
		this._state = STATE.NONE;
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
		if (rect === undefined)
			rect = this.domElement.getBoundingClientRect();
		const len = event.touches.length;
		if (len == 1) {
			this._state = STATE.TOUCH_ROTATE;
			this.pointer_x = event.touches[0].clientX - rect.left;
			this.pointer_y = event.touches[0].clientY - rect.top;
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
			this.pointer_x = event.touches[0].clientX - rect.left;
			this.pointer_y = event.touches[0].clientY - rect.top;
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
	
	const onDocumentWheelEvent = event => {
		if (rect === undefined)
			rect = this.domElement.getBoundingClientRect();
		this._state = STATE.SCROLL;
		let changes = 0;
		if (event.deltaY > 0)
			changes = this.scrollRate;
		else if (event.deltaY < 0)
			changes = this.scrollRate * -1;
		mouseScroll = mouseScroll + changes;
		event.preventDefault(); 
		event.stopImmediatePropagation();  
	}	


	const translate = () => {
		if (typeof this.cameraObject !== "undefined")
		{
			const width = rect.width;
			const height = rect.height;
			const distance = this.cameraObject.position.distanceTo(this.cameraObject.target);
			let fact = 0.0;
			if ((this.cameraObject.far > this.cameraObject.near) && (distance >= this.cameraObject.near) &&
				(distance <= this.cameraObject.far))
			{
				 fact = (distance-this.cameraObject.near)/(this.cameraObject.far-this.cameraObject.near);
			}
			const old_near = new THREE.Vector3(this.previous_pointer_x,height - this.previous_pointer_y,0.0);
			const old_far = new THREE.Vector3(this.previous_pointer_x, height - this.previous_pointer_y,1.0);
			const new_near = new THREE.Vector3(this.pointer_x,height - this.pointer_y,0.0);
			const new_far = new THREE.Vector3(this.pointer_x,height - this.pointer_y,1.0);
			old_near.unproject(this.cameraObject);
			old_far.unproject(this.cameraObject);
			new_near.unproject(this.cameraObject);
			new_far.unproject( this.cameraObject);
			const translate_rate = 0.002;
			const dx=translate_rate*((1.0-fact)*(new_near.x-old_near.x) + fact*(new_far.x-old_far.x));
			const dy=translate_rate*((1.0-fact)*(new_near.y-old_near.y) + fact*(new_far.y-old_far.y));
			const dz=translate_rate*((1.0-fact)*(new_near.z-old_near.z) + fact*(new_far.z-old_far.z));
			this.cameraObject.position.set(this.cameraObject.position.x - dx, this.cameraObject.position.y - dy, this.cameraObject.position.z - dz);
			this.updateDirectionalLight();
			this.cameraObject.target.set(this.cameraObject.target.x - dx, this.cameraObject.target.y - dy, this.cameraObject.target.z - dz);
		}
		this.previous_pointer_x = this.pointer_x;
		this.previous_pointer_y = this.pointer_y;
	}
	
	this.getVectorsFromRotateAboutLookAtPoints = (a, angle) => {
	   a.normalize()
	    let v = this.cameraObject.position.clone();
	    v.sub(this.cameraObject.target)
	    const rel_eye = v.clone();
	    v.normalize()
	    if (0.8 < Math.abs(v.x*a.x+v.y*a.y+v.z*a.z)) {
	      v = this.cameraObject.up.clone();
	    }
	    const b = new THREE.Vector3 (a.y*v.z-a.z*v.y, a.z*v.x-a.x*v.z, a.x*v.y-a.y*v.x);
	    b.normalize()
	    const c = new THREE.Vector3 (a.y*b.z-a.z*b.y, a.z*b.x-a.x*b.z, a.x*b.y-a.y*b.x);
	    const rel_eyea = a.x*rel_eye.x+a.y*rel_eye.y+a.z*rel_eye.z;
	    const rel_eyeb = b.x*rel_eye.x+b.y*rel_eye.y+b.z*rel_eye.z;
	    const rel_eyec = c.x*rel_eye.x+c.y*rel_eye.y+c.z*rel_eye.z;
	    const upa = a.x*this.cameraObject.up.x+a.y*this.cameraObject.up.y+a.z*this.cameraObject.up.z;
	    const upb = b.x*this.cameraObject.up.x+b.y*this.cameraObject.up.y+b.z*this.cameraObject.up.z;
	    const upc = c.x*this.cameraObject.up.x+c.y*this.cameraObject.up.y+c.z*this.cameraObject.up.z;
	    const cos_angle = Math.cos(angle);
	    const sin_angle = Math.sin(angle);
	    const new_b = new THREE.Vector3(cos_angle*b.x+sin_angle*c.x,
	                  cos_angle*b.y+sin_angle*c.y,
	                  cos_angle*b.z+sin_angle*c.z);
	    const new_c = new THREE.Vector3(cos_angle*c.x-sin_angle*b.x,
	                  cos_angle*c.y-sin_angle*b.y,
	                  cos_angle*c.z-sin_angle*b.z);               
	    let eye_position = this.cameraObject.target.clone();
	    eye_position.x = eye_position.x + a.x*rel_eyea + new_b.x*rel_eyeb+new_c.x*rel_eyec
	    eye_position.y = eye_position.y + a.y*rel_eyea + new_b.y*rel_eyeb+new_c.y*rel_eyec
	    eye_position.z = eye_position.z + a.z*rel_eyea + new_b.z*rel_eyeb+new_c.z*rel_eyec
	    eye_position = [eye_position.x, eye_position.y, eye_position.z];
	    const up_vector = [a.x*upa+new_b.x*upb+new_c.x*upc,
            a.y*upa+new_b.y*upb+new_c.y*upc,
            a.z*upa+new_b.z*upb+new_c.z*upc];
	    return {position: eye_position, up: up_vector};
	}
	
	this.rotateAboutLookAtpoint = (a, angle) => {
	  const returned_values = this.getVectorsFromRotateAboutLookAtPoints(a, angle);
	  const eye_position = returned_values.position;
	  const up_vector = returned_values.up;
	  this.cameraObject.position.set(eye_position[0], eye_position[1], eye_position[2]);
	  this.updateDirectionalLight();
	  this.cameraObject.up.set(up_vector[0], up_vector[1], up_vector[2]);
	}

	const tumble = () => {
		if (typeof this.cameraObject !== "undefined")
		{
			const width = rect.width;
			const height = rect.height;
			if ((0<width)&&(0<height))
			{
				const radius=0.25*(width+height);
				delta_x=this.pointer_x-this.previous_pointer_x;
				delta_y=this.previous_pointer_y-this.pointer_y;
				const tangent_dist = Math.sqrt(delta_x*delta_x + delta_y*delta_y);
				if (tangent_dist > 0)
				{
					const dx=-delta_y*1.0/tangent_dist;
					const dy=delta_x*1.0/tangent_dist;
					let d=dx*(this.pointer_x-0.5*(width-1))+dy*(0.5*(height-1)-this.pointer_y);
					if (d > radius)	{
						d = radius;
					}
					else {
						if (d < -radius) {
							d = -radius;
						}
					}
					const phi=Math.acos(d/radius)-0.5*Math.PI;
					const angle=this.tumble_rate*tangent_dist/radius;
					const a = this.cameraObject.position.clone();
					a.sub(this.cameraObject.target);
					a.normalize();
					
					const b = this.cameraObject.up.clone();
					b.normalize();
					
					const c = b.clone();
					c.cross(a);
					c.normalize();

					const e = [dx*c.x + dy*b.x, dx*c.y + dy*b.y, dx*c.z + dy*b.z];
					const axis = new THREE.Vector3();
					axis.set(Math.sin(phi)*a.x+Math.cos(phi)*e[0],
						Math.sin(phi)*a.y+Math.cos(phi)*e[1],
						Math.sin(phi)*a.z+Math.cos(phi)*e[2]);
					this.rotateAboutLookAtpoint(axis, -angle);
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
		} else if (this._state === STATE.SCROLL) {
			delta = mouseScroll;
		} else {
			delta = -1.0 * (this.touchZoomDistanceEnd - this.touchZoomDistanceStart);
			this.touchZoomDistanceStart = this.touchZoomDistanceEnd;
		}
		return delta;
	}
	
	const flyZoom = () => {
		if (typeof this.cameraObject !== "undefined")
		{
			const width = rect.width;
			const height = rect.height;
			const a = this.cameraObject.position.clone();
			a.sub(this.cameraObject.target);
			
			const delta_y=calculateZoomDelta();

			const dist = a.length();				
			const dy = 1.5 * delta_y/height;
			if ((dist + dy*dist) > 0.01) {
				a.normalize()
				const eye_position = this.cameraObject.position.clone();
				eye_position.x = eye_position.x + a.x*dy*dist
				eye_position.y = eye_position.y + a.y*dy*dist
				eye_position.z = eye_position.z + a.z*dy*dist
				this.cameraObject.position.set(eye_position.x, eye_position.y, eye_position.z);
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
				
			}
		}
		if (this._state === STATE.ZOOM) {
			this.previous_pointer_x = this.pointer_x;
			this.previous_pointer_y = this.pointer_y;
		}
		if (this._state === STATE.SCROLL) {
			mouseScroll = 0;
		}
	}
	
	this.setDirectionalLight = directionalLightIn => {
		this.directionalLight = directionalLightIn;
	};
	
	this.updateDirectionalLight = () => {
		if (this.directionalLight != 0) {
			this.directionalLight.position.set(this.cameraObject.position.x,
					this.cameraObject.position.y,
					this.cameraObject.position.z);
		}
	}
	
	
	this.enable = function () {
		enabled = true;
		if (this.domElement && this.domElement.addEventListener) {
			this.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
			this.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
			this.domElement.addEventListener( 'mouseup', onDocumentMouseUp, false );
			this.domElement.addEventListener( 'mouseleave', onDocumentMouseLeave, false );
			this.domElement.addEventListener( 'touchstart', onDocumentTouchStart, false);
			this.domElement.addEventListener( 'touchmove', onDocumentTouchMove, false);
			this.domElement.addEventListener( 'touchend', onDocumentTouchEnd, false);
			this.domElement.addEventListener( 'wheel', onDocumentWheelEvent, false);
			this.domElement.addEventListener( 'contextmenu', event => { event.preventDefault(); }, false );
	    }
	}
	
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
			this.domElement.removeEventListener( 'contextmenu', event => { event.preventDefault(); }, false );
	    }
	}

	this.loadPath = pathData => {
		cameraPath = pathData.CameraPath;
		numberOfCameraPoint = pathData.NumberOfPoints;
	}
	
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
		requestURL = resolveURL(path_url);
		xmlhttp.open("GET", requestURL, true);
		xmlhttp.send();
	}
	
	this.setPathDuration = durationIn => {
		duration = durationIn;
	}
	
	 this.getPlayRate = () => {
	    return playRate;
	  }
	
	this.setPlayRate = playRateIn => {
		playRate = playRateIn;
	}
	 
	const updateTime = delta => {
		let targetTime = inbuildTime + delta;
		if (targetTime > duration)
			targetTime = targetTime - duration
		inbuildTime = targetTime;
	};
	
	 this.getTime = () => {
	    return inbuildTime;
	  }
	
	this.setTime = timeIn => {
	  if (timeIn > duration)
	    inbuildTime = duration;
	  else if (timeIn < 0.0)
	    inbuildTime = 0.0;
	  else
	    inbuildTime = timeIn;
	}
	
	this.getNumberOfTimeFrame = () => {
		return numberOfCameraPoint;
	}
	
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
	
	this.setCurrentTimeFrame = targetTimeFrame => {
	   if (numberOfCameraPoint > 2) {
  		inbuildTime = duration * targetTimeFrame / (numberOfCameraPoint - 1);
  		if (inbuildTime < 0.0)
  			inbuildTime = 0.0;
  		if (inbuildTime > duration)
  			inbuildTime = duration;
	   }
	}

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
	
	this.calculatePathNow = () => {
	  updatePath(0.0);
	}
	
	this.update = timeChanged => {
		const delta = timeChanged * playRate;
		let controlEnabled = enabled;
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
		}
		if (controlEnabled) {
			if ((this._state === STATE.ROTATE) || (this._state === STATE.TOUCH_ROTATE)){
				tumble();
			} else if ((this._state === STATE.PAN) || (this._state === STATE.TOUCH_PAN)){
				translate();
			} else if ((this._state === STATE.ZOOM) || (this._state === STATE.TOUCH_ZOOM) || (this._state === STATE.SCROLL)){
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
			deviceOrientationControl.update();
			//this.directionalLight.target.position.set(this.cameraObject.target.x, 
			//	this.cameraObject.target.y, this.cameraObject.target.z);
		} else {
			this.cameraObject.lookAt( this.cameraObject.target );
		}
	};
	
	this.playPath = () => {
		currentMode = MODE.PATH;
	}
	
	this.stopPath = () => {
		currentMode = MODE.DEFAULT;
	}
	
	this.isPlayingPath = () => {
		return (currentMode === MODE.PATH);
	}
	
	this.enableDirectionalLightUpdateWithPath = flag => {
		updateLightWithPathFlag = flag;
	}
	
	this.enableDeviceOrientation = () => {
		if (!deviceOrientationControl)
			deviceOrientationControl = new ModifiedDeviceOrientationControls(this.cameraObject);
	}
	
	this.disableDeviceOrientation = () => {
		if (deviceOrientationControl) {
			deviceOrientationControl.dispose();
			deviceOrientationControl = undefined;
		}
	}
	
	this.isDeviceOrientationEnabled = () => {
		if (deviceOrientationControl) {
			return true;
		}
		return false;
	}
	
	this.resetView = () => {
		this.cameraObject.near = defaultViewport.nearPlane;
		this.cameraObject.far = defaultViewport.farPlane;
		this.cameraObject.position.set( defaultViewport.eyePosition[0], defaultViewport.eyePosition[1],
				defaultViewport.eyePosition[2]);
		this.cameraObject.target.set( defaultViewport.targetPosition[0],
				defaultViewport.targetPosition[1], defaultViewport.targetPosition[2]  );
		this.cameraObject.up.set( defaultViewport.upVector[0],  defaultViewport.upVector[1],
				defaultViewport.upVector[2]);
		this.cameraObject.updateProjectionMatrix();
		this.updateDirectionalLight();
	}
	
	this.setDefaultCameraSettings = newViewport => {
		if (newViewport.nearPlane)
			defaultViewport.nearPlane = newViewport.nearPlane;
		if (newViewport.farPlane)
			defaultViewport.farPlane = newViewport.farPlane;
		if (newViewport.eyePosition)
			defaultViewport.eyePosition = newViewport.eyePosition;
		if (newViewport.targetPosition)
			defaultViewport.targetPosition = newViewport.targetPosition;
		if (newViewport.upVector)
			defaultViewport.upVector = newViewport.upVector;	
	}
	
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
	}
	
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
	
	this.getDefaultViewport = () => {
		return defaultViewport;
	}
	
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
	
	this.cameraTransition = (startingViewport, endingViewport, durationIn) => {
	  if (rotateCameraTransitionObject == undefined)
	    smoothCameraTransitionObject = new SmoothCameraTransition(startingViewport, endingViewport,
	        this, durationIn);
	}
	
	this.rotateCameraTransition = (axis, angle, duration) => {
	  if (smoothCameraTransitionObject == undefined)
	    rotateCameraTransitionObject = new RotateCameraTransition(axis, angle,
	      this, duration);
	}
	
	this.enableCameraTransition = () => {
	  if (smoothCameraTransitionObject)
	    currentMode = MODE.SMOOTH_CAMERA_TRANSITION;
	  if (rotateCameraTransitionObject)
	    currentMode = MODE.ROTATE_CAMERA_TRANSITION;
	}
	
	this.pauseCameraTransition = () => {
		currentMode = MODE.DEFAULT;
	}
	
	this.stopCameraTransition = () => {
		currentMode = MODE.DEFAULT;
		smoothCameraTransitionObject = undefined;
		rotateCameraTransitionObject = undefined;
	}
	
	this.isTransitioningCamera = () => {
		return (currentMode === MODE.SMOOTH_CAMERA_TRANSITION ||
		    currentMode === MODE.ROTATE_CAMERA_TRANSITION);
	}
	
	this.autoTumble = (tumbleDirectionIn, tumbleRateIn, stopOnCameraInputIn) => {
		cameraAutoTumbleObject = new CameraAutoTumble(tumbleDirectionIn, tumbleRateIn, stopOnCameraInputIn, this);
	}
	
	this.enableAutoTumble = () => {
		currentMode = MODE.AUTO_TUMBLE;
	}
	
	this.stopAutoTumble = () => {
		currentMode = MODE.DEFAULT;
		cameraAutoTumbleObject = undefined;
	}
	
	this.updateAutoTumble = () => {
		if (cameraAutoTumbleObject)
			cameraAutoTumbleObject.requireUpdate = true;
	}
	
	this.isAutoTumble = () => {
		return (currentMode === MODE.AUTO_TUMBLE);
	}
	
	 this.enableRaycaster = (sceneIn, callbackFunctionIn, hoverCallbackFunctionIn) => {
	    if (zincRayCaster == undefined)
	      zincRayCaster = new RayCaster(sceneIn, callbackFunctionIn, hoverCallbackFunctionIn, this.renderer);
	  }
	  
	  this.disableRaycaster = () => {
	    zincRayCaster.disable();
	    zincRayCaster = undefined;
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
	const duration = durationIn;
	let inbuildTime = 0;
	const enabled = true;
	const updateLightWithPathFlag = true;
	let completed = false;
	targetCamera.near = Math.min(startingViewport.nearPlane, endingViewport.nearPlane);
	targetCamera.far = Math.max(startingViewport.farPlane, endingViewport.farPlane);
	targetCamera.cameraObject.up.set( endingViewport.upVector[0],  endingViewport.upVector[1],
	    endingViewport.upVector[2]);
	
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
  const duration = durationIn;
  let inbuildTime = 0;
  const enabled = true;
  const ratio = inbuildTime / duration;
  let completed = false;
  
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

const RayCaster = function (sceneIn, callbackFunctionIn, hoverCallbackFunctionIn, rendererIn) {
	const scene = sceneIn;
	const renderer = rendererIn;
	const callbackFunction = callbackFunctionIn;
	const hoverCallbackFunction = hoverCallbackFunctionIn;
	const enabled = true;
	const raycaster = new THREE.Raycaster();
	raycaster.linePrecision = 0;
	const mouse = new THREE.Vector2();
	
	this.enable = () => {
		enable = true;
	}

	this.disable = () => {
		enable = false;
	}
	
	const getIntersectsObject = (zincCamera, x, y) => {
		const rect = zincCamera.domElement.getBoundingClientRect();
		mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
		mouse.y = -((y - rect.top) / rect.height) * 2 + 1;
		const threejsScene = scene.getThreeJSScene();
		renderer.render(threejsScene, zincCamera.cameraObject);
		raycaster.setFromCamera( mouse, zincCamera.cameraObject);
		return raycaster.intersectObjects( threejsScene.children, true );
	};
	
	this.pick = (zincCamera, x, y) => {
		if (enabled && renderer && scene && zincCamera && callbackFunction) {
			const intersects = getIntersectsObject(zincCamera, x, y);
			callbackFunction(intersects, x, y);
		}
	}
	
	this.move = (zincCamera, x, y) => {
		if (enabled && renderer && scene && zincCamera && hoverCallbackFunction) {
			const intersects = getIntersectsObject(zincCamera, x, y);
			hoverCallbackFunction(intersects, x, y);
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
		const a = new THREE.Vector3(targetCamera.cameraObject.position.x - targetCamera.cameraObject.target.x,
		         targetCamera.cameraObject.position.y - targetCamera.cameraObject.target.y,
		         targetCamera.cameraObject.position.z - targetCamera.cameraObject.target.z);
		a.normalize();
		const b = new THREE.Vector3(targetCamera.cameraObject.up.x, targetCamera.cameraObject.up.y,
		         					targetCamera.cameraObject.up.z);
		b.normalize();
		const c = new THREE.Vector3();
		c.crossVectors(b, a);
		c.normalize();
		const e = new THREE.Vector3(dx*c.x + dy*b.x, dx*c.y + dy*b.y, dx*c.z + dy*b.z);
		tumbleAxis.x = Math.sin(phi) * a.x + Math.cos(phi) * e.x;
		tumbleAxis.y = Math.sin(phi) * a.y + Math.cos(phi) * e.y;
		tumbleAxis.z = Math.sin(phi) * a.z + Math.cos(phi) * e.z;
	};
	
	
	
	this.update = delta => {

		if ( this.enabled === false ) return;
		
		if (this.requireUpdate) {
			computeTumbleAxisAngle(tumbleDirection);
			this.requireUpdate = false;
		}
		targetCamera.rotateAboutLookAtpoint(tumbleAxis, angle);

	}
	
};

/**
 * @author mrdoob / http://mrdoob.com/
 */
StereoCameraZoomFixed = function () {

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

ModifiedDeviceOrientationControls = function ( object ) {

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

exports.Viewport = Viewport
exports.CameraControls = CameraControls
exports.SmoothCameraTransition = SmoothCameraTransition
exports.RotateCameraTransition = RotateCameraTransition
exports.RayCaster = RayCaster
exports.CameraAutoTumble = CameraAutoTumble
exports.StereoEffect = StereoEffect
