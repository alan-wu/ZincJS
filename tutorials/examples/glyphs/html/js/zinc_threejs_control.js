
ZincCameraControls = function ( object, domElement, renderer, scene ) {

	var _this = this;
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
	
	this.update = function () {
		if ((_this._state === STATE.ROTATE) || (_this._state === STATE.TOUCH_ROTATE)){
			tumble()
		} else if (_this._state === STATE.PAN){
			translate()
		} else if (_this._state === STATE.ZOOM){
			flyZoom()
		}
		_this.cameraObject.lookAt( _this.cameraObject.target );
	};
	
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
	
	this.enable();

};
