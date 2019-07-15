var THREE = require('three');


// Alan notes: pause video when stuck
//VideoTexture is used for creating and updating a video projected onto a Three.js texture
exports.VideoHandler = function(srcIn)  {

	var _this = this;
	this.video = undefined;
	this.videoTexture = undefined;
	var src = srcIn;
	var lastTime = 0;
	var lastUpdate = 0;
	var frameRate = 30;
	var videoPlaneLoadedFlag = false;
	var lastPlayPos    = 0;
	var currentPlayPos = 0;
	var bufferingDetected = false;
	
	var checkBuffering = function(delta, playAnimation) {
	    currentPlayPos = _this.video.currentTime;

	    // checking offset should be at most the check interval
	    // but allow for some margin
	    var offset = delta - 0.02;

	    // if no buffering is currently detected,
	    // and the position does not seem to increase
	    // and the _this.video isn't manually paused...
	    if (!bufferingDetected && (currentPlayPos < (lastPlayPos + offset)) &&
	    		!_this.video.paused) {
	        console.log("buffering")
	        bufferingDetected = true;
	    }

	    // if we were buffering but the _this.video has advanced,
	    // then there is no buffering
	    if (bufferingDetected && (currentPlayPos > (lastPlayPos + offset)) &&
	    		!_this.video.paused) {
	        console.log("not buffering anymore")
	        bufferingDetected = false;
	    }
	    lastPlayPos = currentPlayPos;
	}

	var initialise = function(){
		if (document) {
		  	_this.video = document.createElement( 'video' );
		  	_this.video.src = src;
		  	_this.video.load();
		  	_this.video.loop = true;
		}
	}

	this.setMorphTime = function(time, duration){
		var actualTime = time / duration * _this.video.duration;
		_this.video.currentTime = actualTime;
	}

	// videoPlaneLoaded connects the video to the video texture once it has loaded
	 this.getVideoDuration = function() {
		 return _this.video.duration;
	}

	this.createCanvasVideoTexture = function(){
		_this.videoTexture = new THREE.VideoTexture( _this.video );
		_this.videoTexture.minFilter = THREE.LinearFilter;
		_this.videoTexture.magFilter = THREE.LinearFilter;
		_this.videoTexture.format = THREE.RGBFormat;

		return _this.videoTexture;
	}
	
	this.getCurrentTime = function(duration) {
		if (_this.video)
			return duration * (_this.video.currentTime / _this.video.duration);
		else
			return 0;
	}

	this.isReadyToPlay = function(){
		// video.readyState 3 means we have data to load for the current time and foreseeable future
		if (_this.video && _this.video.readyState >= 3){
			return true;
		}
		return false;
	}
	
	//this should be handle by scene... check the sync at 
	initialise();

}