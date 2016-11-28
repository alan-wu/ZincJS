ZincViewport = function () {
	this.nearPlane = 0.1943;
	this.farPlane = 7.8852;
	this.eyePosition = [0.0, -3.88552, 0.0];
	this.targetPosition = [0.0, 0.0, 0.0];
	this.upVector = [ 0.0, 0.0, 1.0];
	var _this = this;
}

ZincCameraControls = function ( object, domElement, renderer, scene ) {

	var _this = this;
	var MODE = { NONE: -1, DEFAULT: 0, PATH: 1, SMOOTH_CAMERA_TRANSITION: 2 };
	var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM: 4, TOUCH_PAN: 5 };
	this.cameraObject = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;
	this.renderer = renderer
	this.scene = scene 
	this.tumble_rate = 1.5;
	this.pointer_x = 0;
	this.pointer_y = 0;
	this.previous_pointer_x = 0;
	this.previous_pointer_y = 0;
	this.near_plane_fly_debt = 0.0;
	this.touchZoomDistanceStart = 0;
	this.touchZoomDistanceEnd = 0;
	this.directionalLight = 0;
	var duration = 3000;
	var inbuildTime = 0;
	var cameraPath = undefined;
	var numerOfCameraPoint = undefined;
	var updateLightWithPathFlag = false;
	var playRate = 500;
	var deviceOrientationControl = undefined;
	var defaultViewport = new ZincViewport();
	var currentMode = MODE.DEFAULT;
	var smoothCameraTransitionObject = undefined;
	this._state = STATE.NONE;
	this.targetTouchId = -1;
	
	function onDocumentMouseDown( event ) {
		if (event.which == 1) { 
	 		_this._state = STATE.ROTATE
		} else if (event.which == 2) {
			event.preventDefault();
			_this._state = STATE.PAN
	    } 
	   	else if (event.which == 3) {
	    	_this._state = STATE.ZOOM
	    }
		_this.pointer_x = event.clientX 
		_this.pointer_y = event.clientY
		_this.previous_pointer_x = _this.pointer_x
		_this.previous_pointer_y= _this.pointer_y
	}

	function onDocumentMouseMove( event ) {
		_this.pointer_x = event.clientX
		_this.pointer_y = event.clientY;
	}
	
	function onDocumentMouseUp( event ) {
		_this._state = STATE.NONE;
	}
	
	function onDocumentTouchStart( event ) {
		var len = event.touches.length
		if (len == 1) {
			_this._state = STATE.TOUCH_ROTATE;
			_this.pointer_x = event.touches[0].clientX 
			_this.pointer_y = event.touches[0].clientY
			_this.previous_pointer_x = _this.pointer_x
			_this.previous_pointer_y= _this.pointer_y
		} else if (len == 2) {
			_this._state = STATE.TOUCH_ZOOM;
			var dx = event.touches[ 0 ].clientX - event.touches[ 1 ].clientX;
			var dy = event.touches[ 0 ].clientY - event.touches[ 1 ].clientY;
			_this.touchZoomDistanceEnd = _this.touchZoomDistanceStart = Math.sqrt( dx * dx + dy * dy );
		} else if (len == 3) {
			_this._state = STATE.TOUCH_PAN;
			_this.targetTouchId = event.touches[0].identifier
			_this.pointer_x = event.touches[0].clientX
			_this.pointer_y = event.touches[0].clientY
			_this.previous_pointer_x = _this.pointer_x
			_this.previous_pointer_y= _this.pointer_y				
		}
	}
	
	function onDocumentTouchMove( event ) {
		event.preventDefault();
		event.stopPropagation();
		var len = event.touches.length
		if (len == 1) {
			_this.pointer_x = event.touches[0].clientX
			_this.pointer_y = event.touches[0].clientY;
		} else if (len == 2) {
			if (_this._state === STATE.TOUCH_ZOOM) {
				var dx = event.touches[ 0 ].clientX - event.touches[ 1 ].clientX;
				var dy = event.touches[ 0 ].clientY - event.touches[ 1 ].clientY;
				_this.touchZoomDistanceEnd = Math.sqrt( dx * dx + dy * dy )
				flyZoom()
				_this.renderer.render( _this.scene, _this.cameraObject );
			}
		} else if (len == 3) {
			if (_this._state === STATE.TOUCH_PAN) {
				for (var i = 0; i < 3; i++) {
					if (event.touches[i].identifier == _this.targetTouchId) {
						_this.pointer_x = event.touches[0].clientX 
						_this.pointer_y = event.touches[0].clientY
						translate()
						_this.renderer.render( scene, _this.cameraObject );
					}
				}
			}				
		}
	}
	
	function onDocumentTouchEnd( event ) {
		var len = event.touches.length
		_this.touchZoomDistanceStart = _this.touchZoomDistanceEnd = 0;
		_this.targetTouchId = -1;
		_this._state = STATE.NONE;
	}		


	function translate()
	{
		if (typeof _this.cameraObject !== "undefined")
		{
			var width = window.innerWidth;
			var height = window.innerHeight;
			var distance = _this.cameraObject.position.distanceTo(_this.cameraObject.target)
			var fact = 0.0;
			if ((_this.cameraObject.far > _this.cameraObject.near) && (distance >= _this.cameraObject.near) &&
				(distance <= _this.cameraObject.far))
			{
				 fact = (distance-_this.cameraObject.near)/(_this.cameraObject.far-_this.cameraObject.near);
			}
			var old_near = new THREE.Vector3(_this.previous_pointer_x,height - _this.previous_pointer_y,0.0);
			var old_far = new THREE.Vector3(_this.previous_pointer_x, height - _this.previous_pointer_y,1.0);
			var new_near = new THREE.Vector3(_this.pointer_x,height - _this.pointer_y,0.0);
			var new_far = new THREE.Vector3(_this.pointer_x,height - _this.pointer_y,1.0);
			old_near.unproject(_this.cameraObject);
			old_far.unproject(_this.cameraObject);
			new_near.unproject(_this.cameraObject);
			new_far.unproject( _this.cameraObject);
			var translate_rate = 0.002;
			var dx=translate_rate*((1.0-fact)*(new_near.x-old_near.x) + fact*(new_far.x-old_far.x));
			var dy=translate_rate*((1.0-fact)*(new_near.y-old_near.y) + fact*(new_far.y-old_far.y));
			var dz=translate_rate*((1.0-fact)*(new_near.z-old_near.z) + fact*(new_far.z-old_far.z));
			_this.cameraObject.position.set(_this.cameraObject.position.x - dx, _this.cameraObject.position.y - dy, _this.cameraObject.position.z - dz);
			_this.updateDirectionalLight();
			_this.cameraObject.target = new THREE.Vector3(_this.cameraObject.target.x - dx, _this.cameraObject.target.y - dy, _this.cameraObject.target.z - dz);
		}
		_this.previous_pointer_x = _this.pointer_x
		_this.previous_pointer_y = _this.pointer_y
	}
	
	function rotateAboutLookAtpoint(a, angle)
	{
		a.normalize()
		var v = _this.cameraObject.position.clone();
		
		v.sub(_this.cameraObject.target)
		var rel_eye = v.clone()
		v.normalize()
		if (0.8 < Math.abs(v.x*a.x+v.y*a.y+v.z*a.z)) {
			v = _this.cameraObject.up.clone();
		}
		var b = new THREE.Vector3 (a.y*v.z-a.z*v.y, a.z*v.x-a.x*v.z, a.x*v.y-a.y*v.x);
		b.normalize()
		var c = new THREE.Vector3 (a.y*b.z-a.z*b.y, a.z*b.x-a.x*b.z, a.x*b.y-a.y*b.x);
		var rel_eyea = a.x*rel_eye.x+a.y*rel_eye.y+a.z*rel_eye.z;
		var rel_eyeb = b.x*rel_eye.x+b.y*rel_eye.y+b.z*rel_eye.z;
		var rel_eyec = c.x*rel_eye.x+c.y*rel_eye.y+c.z*rel_eye.z;
		var upa = a.x*_this.cameraObject.up.x+a.y*_this.cameraObject.up.y+a.z*_this.cameraObject.up.z;
		var upb = b.x*_this.cameraObject.up.x+b.y*_this.cameraObject.up.y+b.z*_this.cameraObject.up.z;
		var upc = c.x*_this.cameraObject.up.x+c.y*_this.cameraObject.up.y+c.z*_this.cameraObject.up.z;
		var cos_angle = Math.cos(angle)
		var sin_angle = Math.sin(angle)
		var new_b = new THREE.Vector3(cos_angle*b.x+sin_angle*c.x,
									cos_angle*b.y+sin_angle*c.y,
									cos_angle*b.z+sin_angle*c.z);
		var new_c = new THREE.Vector3(cos_angle*c.x-sin_angle*b.x,
									cos_angle*c.y-sin_angle*b.y,
									cos_angle*c.z-sin_angle*b.z);								
		var eye_position = _this.cameraObject.target.clone()
		eye_position.x = eye_position.x + a.x*rel_eyea + new_b.x*rel_eyeb+new_c.x*rel_eyec
		eye_position.y = eye_position.y + a.y*rel_eyea + new_b.y*rel_eyeb+new_c.y*rel_eyec
		eye_position.z = eye_position.z + a.z*rel_eyea + new_b.z*rel_eyeb+new_c.z*rel_eyec
		_this.cameraObject.position.set(eye_position.x, eye_position.y, eye_position.z);
		_this.updateDirectionalLight();
		_this.cameraObject.up.set(a.x*upa+new_b.x*upb+new_c.x*upc,
					a.y*upa+new_b.y*upb+new_c.y*upc,
					a.z*upa+new_b.z*upb+new_c.z*upc);
	}

	function tumble()
	{
		if (typeof _this.cameraObject !== "undefined")
		{
			var width = window.innerWidth;
			var height = window.innerHeight;
			if ((0<width)&&(0<height))
			{
				var radius=0.25*(width+height);
				delta_x=_this.pointer_x-_this.previous_pointer_x;
				delta_y=_this.previous_pointer_y-_this.pointer_y;
				var tangent_dist = Math.sqrt(delta_x*delta_x + delta_y*delta_y)
				if (tangent_dist > 0)
				{
					var dx=-delta_y*1.0/tangent_dist;
					var dy=delta_x*1.0/tangent_dist;
					var d=dx*(_this.pointer_x-0.5*(width-1))+dy*(0.5*(height-1)-_this.pointer_y);
					if (d > radius)	{
						d = radius;
					}
					else {
						if (d < -radius) {
							d = -radius;
						}
					}
					var phi=Math.acos(d/radius)-0.5*Math.PI;
					var angle=_this.tumble_rate*tangent_dist/radius;
					var a = _this.cameraObject.position.clone();
					a.sub(_this.cameraObject.target);
					a.normalize();
					
					var b = _this.cameraObject.up.clone();
					b.normalize();
					
					var c = b.clone();
					c.cross(a);
					c.normalize();

					var e = [dx*c.x + dy*b.x, dx*c.y + dy*b.y, dx*c.z + dy*b.z];
					var axis = new THREE.Vector3()
					axis.set(Math.sin(phi)*a.x+Math.cos(phi)*e[0],
						Math.sin(phi)*a.y+Math.cos(phi)*e[1],
						Math.sin(phi)*a.z+Math.cos(phi)*e[2]);
					rotateAboutLookAtpoint(axis, -angle)
				}
			}
		}
		_this.previous_pointer_x = _this.pointer_x
		_this.previous_pointer_y = _this.pointer_y
	}
	
	function calculateZoomDelta()
	{
		var delta = 0;
		if (_this._state === STATE.ZOOM)
		{
			delta=_this.previous_pointer_y-_this.pointer_y;
		}
		else
		{
			delta = -1.0 * (_this.touchZoomDistanceEnd - _this.touchZoomDistanceStart);
			_this.touchZoomDistanceStart = _this.touchZoomDistanceEnd;
		}

	
		return delta;
	}
	
	function flyZoom() {
		if (typeof _this.cameraObject !== "undefined")
		{
			var width = window.innerWidth;
			var height = window.innerHeight;
			var a = _this.cameraObject.position.clone();
			a.sub(_this.cameraObject.target);
			
			var delta_y=calculateZoomDelta();

			var dist = a.length()				
			var dy = 1.5 * delta_y/height;
			if ((dist + dy*dist) > 0.01) {
				a.normalize()
				var eye_position = _this.cameraObject.position.clone()
				eye_position.x = eye_position.x + a.x*dy*dist
				eye_position.y = eye_position.y + a.y*dy*dist
				eye_position.z = eye_position.z + a.z*dy*dist
				_this.cameraObject.position.set(eye_position.x, eye_position.y, eye_position.z);
				_this.updateDirectionalLight();
				var near_far_minimum_ratio = 0.00001;
				if ((near_far_minimum_ratio * _this.cameraObject.far) <
					(_this.cameraObject.near + dy*dist + _this.near_plane_fly_debt)) {
					if (_this.near_plane_fly_debt != 0.0)	{
						_this.near_plane_fly_debt += dy*dist;
						if (_this.near_plane_fly_debt > 0.0) {
							_this.cameraObject.near += _this.near_plane_fly_debt;
							_this.cameraObject.far += _this.near_plane_fly_debt;
							_this.near_plane_fly_debt = 0.0;
						}
						else {
							_this.cameraObject.near += dy*dist;
							_this.cameraObject.far += dy*dist;
						}
					}			
				}
				else {
					if (_this.near_plane_fly_debt == 0.0) {
						var diff = _this.cameraObject.near - near_far_minimum_ratio * _this.cameraObject.far;
						_this.cameraObject.near = near_far_minimum_ratio * _this.cameraObject.far;
						_this.cameraObject.far -= diff;
						_this.near_plane_fly_debt -= near_far_minimum_ratio * _this.cameraObject.far;
					}
					_this.near_plane_fly_debt += dy*dist;
				}
				
			}
		}
		if (_this._state === STATE.ZOOM) {
			_this.previous_pointer_x = _this.pointer_x
			_this.previous_pointer_y = _this.pointer_y
		}
	}
	
	this.setDirectionalLight = function (directionalLightIn) {
		_this.directionalLight = directionalLightIn;
	};
	
	this.updateDirectionalLight = function() {
		if (_this.directionalLight != 0)
			_this.directionalLight.position.set(_this.cameraObject.position.x,
					_this.cameraObject.position.y,
					_this.cameraObject.position.z);
	}
	
	
	this.enable = function () {
		enabled = true;
		if (this.domElement.addEventListener) {
			this.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
			this.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
			this.domElement.addEventListener( 'mouseup', onDocumentMouseUp, false );
			this.domElement.addEventListener( 'touchstart', onDocumentTouchStart, false);
			this.domElement.addEventListener( 'touchmove', onDocumentTouchMove, false);
			this.domElement.addEventListener( 'touchend', onDocumentTouchEnd, false);
			this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	    }
	}
	
	this.disable = function () {
		enabled = false;
		if (this.domElement.removeEventListener) {
			this.domElement.removeEventListener( 'mousedown', onDocumentMouseDown, false );
			this.domElement.removeEventListener( 'mousemove', onDocumentMouseMove, false );
			this.domElement.removeEventListener( 'mouseup', onDocumentMouseUp, false );
			this.domElement.removeEventListener( 'touchstart', onDocumentTouchStart, false);
			this.domElement.removeEventListener( 'touchmove', onDocumentTouchMove, false);
			this.domElement.removeEventListener( 'touchend', onDocumentTouchEnd, false);
			this.domElement.removeEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	    }
	}
	

	var loadPath = function(pathData)
	{
		cameraPath = pathData.CameraPath;
		numerOfCameraPoint = pathData.NumberOfPoints;
	}
	
	this.loadPathURL = function(path_url, finishCallback)
	{
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = function() {
		    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
		        var pathData = JSON.parse(xmlhttp.responseText);
		        loadPath(pathData);
		    }
		}
		requestURL = path_url;
		xmlhttp.open("GET", requestURL, true);
		xmlhttp.send();
	}
	
	this.setPathDuration = function(durationIn) {
		duration = durationIn;
	}
	
	this.setTime = function(time) {
		inbuildTime = time;
	}
	
	this.setPlayRate = function(playRateIn) {
		playRate = playRateIn;
	}
	 
	var updateTime = function(delta) {
		var targetTime = inbuildTime + delta;
		if (targetTime > duration)
			targetTime = targetTime - duration
		inbuildTime = targetTime;
	}
	
	this.getNumberOfTimeFrame = function() {
		return numerOfCameraPoint;
	}
	
	this.getCurrentTimeFrame = function() {
		var current_time = inbuildTime/duration * (numerOfCameraPoint - 1);
		var bottom_frame =  Math.floor(current_time);
		var proportion = 1 - (current_time - bottom_frame);
		var top_frame =  Math.ceil(current_time);
		return [bottom_frame, top_frame, proportion];
	}
	
	this.setCurrentTimeFrame = function(targetTimeFrame) {
		inbuildTime = duration * targetTimeFrame / (numerOfCameraPoint - 1);
		if (inbuildTime < 0.0)
			inbuildTime = 0.0;
		if (inbuildTime > duration)
			inbuildTime = duration;	
	}

	var updatePath = function(delta)	{
		if (currentMode === MODE.PATH) {
			updateTime(delta);
			if (cameraPath) {
				var time_frame = _this.getCurrentTimeFrame();
				var bottom_frame = time_frame[0];
				var top_frame = time_frame[1];
				var proportion = time_frame[2];
	
				var bot_pos = [cameraPath[bottom_frame*3], cameraPath[bottom_frame*3+1], cameraPath[bottom_frame*3+2]];
				var top_pos = [cameraPath[top_frame*3], cameraPath[top_frame*3+1], cameraPath[top_frame*3+2]];
				var current_positions = [];
				for (var i = 0; i < bot_pos.length; i++) {
					current_positions.push(proportion * bot_pos[i] + (1.0 - proportion) * top_pos[i]);
				}
				_this.cameraObject.position.set(current_positions[0], current_positions[1], current_positions[2]);
				_this.cameraObject.target = new THREE.Vector3(top_pos[0], top_pos[1], top_pos[2]);
				if (updateLightWithPathFlag) {
					_this.directionalLight.position.set(current_positions[0], current_positions[1], current_positions[2]);
					_this.directionalLight.target.position.set(top_pos[0], top_pos[1], top_pos[2]);
				}					
			}
		}
	}
	
	this.update = function (timeChanged) {
		var delta = timeChanged * playRate;
		var controlEnabled = enabled;
		if (currentMode === MODE.PATH)
			updatePath(delta);
		else if (currentMode === MODE.SMOOTH_CAMERA_TRANSITION && smoothCameraTransitionObject) {
			smoothCameraTransitionObject.update(delta);
			if (smoothCameraTransitionObject.isTransitionCompleted()) {
				smoothCameraTransitionObject == undefined;
				currentMode = MODE.DEFAULT;
			}
			controlEnabled = false;
		}
		if (controlEnabled && currentMode !== MODE.SMOOTH_CAMERA_TRANSITION) {
			if ((_this._state === STATE.ROTATE) || (_this._state === STATE.TOUCH_ROTATE)){
				tumble();
			} else if (_this._state === STATE.PAN){
				translate();
			} else if (_this._state === STATE.ZOOM){
				flyZoom();
			}
		}
		if (deviceOrientationControl) {
			deviceOrientationControl.update();
			//_this.directionalLight.target.position.set(_this.cameraObject.target.x, 
			//	_this.cameraObject.target.y, _this.cameraObject.target.z);
		} else {
			_this.cameraObject.lookAt( _this.cameraObject.target );
		}
	};
	
	this.playPath = function () {
		currentMode = MODE.PATH;
	}
	
	this.stopPath = function () {
		currentMode = MODE.DEFAULT;
	}
	
	this.isPlayingPath = function () {
		return (currentMode === MODE.PATH);
	}
	
	this.enableDirectionalLightUpdateWithPath = function (flag) {
		updateLightWithPathFlag = flag;
	}
	
	this.enableDeviceOrientation = function() {
		if (!deviceOrientationControl)
			deviceOrientationControl = new ModifiedDeviceOrientationControls(_this.cameraObject);
	}
	
	this.disableDeviceOrientation = function() {
		if (deviceOrientationControl) {
			deviceOrientationControl.dispose();
			deviceOrientationControl = undefined;
		}
	}
	
	this.isDeviceOrientationEnabled = function() {
		if (deviceOrientationControl) {
			return true;
		}
		return false;
	}
	
	this.resetView = function() {
		_this.cameraObject.near = defaultViewport.nearPlane;
		_this.cameraObject.far = defaultViewport.farPlane;
		_this.cameraObject.position.set( defaultViewport.eyePosition[0], defaultViewport.eyePosition[1],
				defaultViewport.eyePosition[2]);
		_this.cameraObject.target = new THREE.Vector3( defaultViewport.targetPosition[0],
				defaultViewport.targetPosition[1], defaultViewport.targetPosition[2]  );
		_this.cameraObject.up.set( defaultViewport.upVector[0],  defaultViewport.upVector[1],
				defaultViewport.upVector[2]);
		_this.cameraObject.updateProjectionMatrix();
		_this.updateDirectionalLight();
	}
	
	this.setDefaultCameraSettings = function(nearPlaneIn, farPlaneIn, eyePositionIn,
			targetPositionIn, upVectorIn) {
		if (nearPlaneIn)
			defaultViewport.nearPlane = nearPlaneIn;
		if (farPlaneIn)
			defaultViewport.farPlane = farPlaneIn;
		if (eyePositionIn)
			defaultViewport.eyePosition = eyePositionIn;
		if (targetPositionIn)
			defaultViewport.targetPosition = targetPositionIn;
		if (upVectorIn)
			defaultViewport.upVector = upVectorIn;	
	}
	
	this.setCurrentCameraSettings = function(newViewport) {
		if (newViewport.nearPlane)
			_this.cameraObject.near = newViewport.nearPlane;
		if (newViewport.farPlane)
			_this.cameraObject.far = newViewport.farPlane;
		if (newViewport.eyePosition)
			_this.cameraObject.position.set( newViewport.eyePosition[0], 
					newViewport.eyePosition[1], newViewport.eyePosition[2]);
		if (newViewport.targetPosition)
			_this.cameraObject.target = new THREE.Vector3( newViewport.targetPosition[0],
					newViewport.targetPosition[1], newViewport.targetPosition[2]  );
		if (newViewport.upVector)
			_this.cameraObject.up.set( newViewport.upVector[0], newViewport.upVector[1],
					newViewport.upVector[2]);
		_this.cameraObject.updateProjectionMatrix();
		_this.updateDirectionalLight();
	}
	
	this.getViewportFromCentreAndRadius = function(centreX, centreY, centreZ, radius, view_angle, clip_distance) {
		var eyex = _this.cameraObject.position.x-_this.cameraObject.target.x;
		var eyey = _this.cameraObject.position.y-_this.cameraObject.target.y;
		var eyez = _this.cameraObject.position.z-_this.cameraObject.target.z;
		var fact = 1.0/Math.sqrt(eyex*eyex+eyey*eyey+eyez*eyez);
		eyex = eyex * fact;
		eyey = eyey * fact;
		eyez = eyez * fact;
		/* look at the centre of the sphere */
		var localTargetPosition = [centreX, centreY, centreZ];
		/* shift the eye position to achieve the desired view_angle */
		var eye_distance = radius/Math.tan(view_angle*Math.PI/360.0);
		var localEyePosition = [ centreX + eyex*eye_distance,  centreY + eyey*eye_distance,
		                    centreZ + eyez*eye_distance];
		var localFarPlane = eye_distance+clip_distance;
		var localNearPlane = 0.0;
		var nearClippingFactor = 0.95;
		if (clip_distance > nearClippingFactor*eye_distance)
		{
			localNearPlane = (1.0 - nearClippingFactor)*eye_distance;
		}
		else
		{
			localNearPlane = eye_distance - clip_distance;
		}
		var newViewport = new ZincViewport();
		newViewport.nearPlane = localNearPlane;
		newViewport.farPlane = localFarPlane;
		newViewport.eyePosition = localEyePosition;
		newViewport.targetPosition = localTargetPosition;
		newViewport.upVector = [_this.cameraObject.up.x, _this.cameraObject.up.y,
		                        _this.cameraObject.up.z];
		
		return newViewport;
	}
	
	this.getDefaultViewport = function() {
		return defaultViewport;
	}
	
	this.getCurrentViewport = function() {
		var currentViewport = new ZincViewport();
		currentViewport.nearPlane = _this.cameraObject.near;
		currentViewport.farPlane = _this.cameraObject.far;
		currentViewport.eyePosition[0] = _this.cameraObject.position.x;
		currentViewport.eyePosition[1] = _this.cameraObject.position.y;
		currentViewport.eyePosition[2] = _this.cameraObject.position.z;
		currentViewport.targetPosition[0] = _this.cameraObject.target.x;
		currentViewport.targetPosition[1] = _this.cameraObject.target.y;
		currentViewport.targetPosition[2] = _this.cameraObject.target.z;
		currentViewport.upVector[0] = _this.cameraObject.up.x;
		currentViewport.upVector[1] = _this.cameraObject.up.y;
		currentViewport.upVector[2] = _this.cameraObject.up.z;
		return currentViewport;
	}
	
	this.getDefaultEyePosition = function() {
		return eyePosition;
	}
	
	this.getDefaultTargetPosition = function() {
		return targetPosition;
	}
	
	this.cameraTransition = function (startingViewport, endingViewport, durationIn) {
		smoothCameraTransitionObject = new ZincSmoothCameraTransition(startingViewport, endingViewport,
			_this, durationIn);
	}
	
	this.enableCameraTransition = function () {
		currentMode = MODE.SMOOTH_CAMERA_TRANSITION;
	}
	
	this.pauseCameraTransition = function () {
		currentMode = MODE.DEFAULT;
	}
	
	this.isTransitioningCamera = function () {
		return (currentMode === MODE.SMOOTH_CAMERA_TRANSITION);
	}
	
	this.enable();

};

ZincSmoothCameraTransition = function (startingViewport, endingViewport, targetCameraIn, durationIn) {
	var startingEyePosition = startingViewport.eyePosition;
	var startingTargetPosition = startingViewport.targetPosition;
	var endingEyePosition = endingViewport.eyePosition;
	var endingTargetPosition = endingViewport.targetPosition;
	var targetCamera = targetCameraIn;
	var _this = this;
	var duration = durationIn;
	var inbuildTime = 0;
	var enabled = true;
	var updateLightWithPathFlag = true;
	var completed = false;
	targetCamera.near = Math.min(startingViewport.nearPlane, endingViewport.nearPlane);
	targetCamera.far = Math.max(startingViewport.farPlane, endingViewport.farPlane);
	
	var updateTime = function(delta) {
		var targetTime = inbuildTime + delta;
		if (targetTime > duration)
			targetTime = duration;
		inbuildTime = targetTime;
	}
	
	var updateCameraSettings = function () {
		var ratio = inbuildTime / duration;
		var eyePosition = [startingEyePosition[0] * (1.0 - ratio) + endingEyePosition[0] * ratio,
		                   startingEyePosition[1] * (1.0 - ratio) + endingEyePosition[1] * ratio,
		                   startingEyePosition[2] * (1.0 - ratio) + endingEyePosition[2] * ratio];
		var targetPosition = [startingTargetPosition[0] * (1.0 - ratio) + endingTargetPosition[0] * ratio,
		                      startingTargetPosition[1] * (1.0 - ratio) + endingTargetPosition[1] * ratio,
		                      startingTargetPosition[2] * (1.0 - ratio) + endingTargetPosition[2] * ratio];
		targetCamera.cameraObject.position.set( eyePosition[0], eyePosition[1], eyePosition[2]);
		targetCamera.cameraObject.target = new THREE.Vector3( targetPosition[0], targetPosition[1], targetPosition[2]  );
	}
	
	this.update = function (delta) {

		if ( _this.enabled === false ) return;
		
		updateTime(delta);
		
		updateCameraSettings();
		
		if (inbuildTime == duration) {
			completed = true;
		}

	}
	
	this.isTransitionCompleted = function () {
		return completed;
	}
	
};


/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.StereoCameraZoomFixed = function () {

	this.type = 'StereoCamera';

	this.aspect = 1;

	this.cameraL = new THREE.PerspectiveCamera();
	this.cameraL.layers.enable( 1 );
	this.cameraL.matrixAutoUpdate = false;

	this.cameraR = new THREE.PerspectiveCamera();
	this.cameraR.layers.enable( 2 );
	this.cameraR.matrixAutoUpdate = false;

};

Object.assign( THREE.StereoCameraZoomFixed.prototype, {

	update: ( function () {

		var focus, fov, aspect, near, far, zoom;

		var eyeRight = new THREE.Matrix4();
		var eyeLeft = new THREE.Matrix4();

		return function update( camera ) {

			var needsUpdate = focus !== camera.focus || fov !== camera.fov ||
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

				var projectionMatrix = camera.projectionMatrix.clone();
				var eyeSep = 0.064 / 2;
				var eyeSepOnProjection = eyeSep * near / focus;
				var ymax = near * Math.tan( THREE.Math.DEG2RAD * fov * 0.5 ) / camera.zoom;
				var xmin, xmax;

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

	} )()

} );



/** the following StereoEffect is written by third party */
/**
 * @author alteredq / http://alteredqualia.com/
 * @authod mrdoob / http://mrdoob.com/
 * @authod arodic / http://aleksandarrodic.com/
 * @authod fonserbc / http://fonserbc.github.io/
*/
THREE.StereoEffect = function ( renderer ) {

	var _stereo = new THREE.StereoCameraZoomFixed();
	_stereo.aspect = 0.5;

	this.setSize = function ( width, height ) {

		renderer.setSize( width, height );

	};

	this.render = function ( scene, camera ) {

		scene.updateMatrixWorld();

		if ( camera.parent === null ) camera.updateMatrixWorld();

		_stereo.update( camera );

		var size = renderer.getSize();

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

	var scope = this;

	this.object = object;
	this.object.rotation.reorder( "YXZ" );

	this.enabled = true;

	this.deviceOrientation = {};
	this.screenOrientation = 0;

	var onDeviceOrientationChangeEvent = function ( event ) {

		scope.deviceOrientation = event;

	};

	var onScreenOrientationChangeEvent = function () {

		scope.screenOrientation = window.orientation || 0;

	};

	// The angles alpha, beta and gamma form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''

	var setObjectQuaternion = function () {

		var zee = new THREE.Vector3( 0, 0, 1 );

		var euler = new THREE.Euler();

		var q0 = new THREE.Quaternion();

		var q1 = new THREE.Quaternion( - Math.sqrt( 0.5 ), 0, 0, Math.sqrt( 0.5 ) ); // - PI/2 around the x-axis

		return function ( cameraObject, alpha, beta, gamma, orient ) {
			
			var vector = new THREE.Vector3(0, 0, 1);
			
			vector.subVectors(cameraObject.target, cameraObject.position);

			euler.set( beta, alpha, - gamma, 'YXZ' );                       // 'ZXY' for the device, but 'YXZ' for us

			var quaternion = new THREE.Quaternion();
			
			quaternion.setFromEuler( euler );                               // orient the device

			quaternion.multiply( q1 );                                      // camera looks out the back of the device, not the top

			quaternion.multiply( q0.setFromAxisAngle( zee, - orient ) );    // adjust for screen orientation
			
			vector.applyQuaternion(quaternion);
				
			vector.addVectors(cameraObject.position, vector);
			
			cameraObject.lookAt(vector);

		}

	}();

	this.connect = function() {

		onScreenOrientationChangeEvent(); // run once on load

		window.addEventListener( 'orientationchange', onScreenOrientationChangeEvent, false );
		window.addEventListener( 'deviceorientation', onDeviceOrientationChangeEvent, false );

		scope.enabled = true;

	};

	this.disconnect = function() {

		window.removeEventListener( 'orientationchange', onScreenOrientationChangeEvent, false );
		window.removeEventListener( 'deviceorientation', onDeviceOrientationChangeEvent, false );

		scope.enabled = false;

	};

	this.update = function () {

		if ( scope.enabled === false ) return;

		var alpha  = scope.deviceOrientation.alpha ? THREE.Math.degToRad( scope.deviceOrientation.alpha ) : 0; // Z
		var beta   = scope.deviceOrientation.beta  ? THREE.Math.degToRad( scope.deviceOrientation.beta  ) : 0; // X'
		var gamma  = scope.deviceOrientation.gamma ? THREE.Math.degToRad( scope.deviceOrientation.gamma ) : 0; // Y''
		var orient = scope.screenOrientation       ? THREE.Math.degToRad( scope.screenOrientation       ) : 0; // O

		setObjectQuaternion( scope.object, alpha, beta, gamma, orient );

	};

	this.dispose = function () {

		this.disconnect();

	};

	this.connect();

};


