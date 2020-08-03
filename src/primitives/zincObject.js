const THREE = require('three');

const ZincObject = function() {
  this.geometry = undefined;
  // THREE.Mesh
  this.morph = undefined;
  	/**
	 * Groupname given to this geometry.
	 */
  this.groupName = undefined;
  this.timeEnabled = false;
  this.morphColour = false;
  this.inbuildTime = 0;
	this.mixer = undefined;
	/**
	 * Total duration of the animation, this value interacts with the 
	 * {@link Zinc.Renderer#playRate} to produce the actual duration of the
	 * animation. Actual time in second = duration / playRate.
	 */
  this.duration = 3000;
  this.clipAction = undefined;
  this.userData = [];
  this.videoHandler = undefined;


  this.marker = undefined;
  this.markerUpdateRequired = true;
}

ZincObject.prototype.setName = function(groupNameIn) {
  this.groupName = groupNameIn;
  if (this.morph) {
    this.morph.name = this.groupName;
  }
}

/**
 * Get the local time of this geometry, it returns a value between 
 * 0 and the duration.
 * 
 * @return {Number}
 */
ZincObject.prototype.getCurrentTime = function() {
  if (this.clipAction) {
    const ratio = this.clipAction.time / this.clipAction._clip.duration;
    return this.duration * ratio;
  } else {
    return this.inbuildTime;
  }
}

const updateMorphColorAttribute = function(targetGeometry, morph) {
  if (morph && targetGeometry.morphAttributes[ "color" ]) {
    const morphColors = targetGeometry.morphAttributes[ "color" ];
    const influences = morph.morphTargetInfluences;
    const length = influences.length;
    targetGeometry.removeAttribute( 'morphColor0' );
    targetGeometry.removeAttribute( 'morphColor1' );
    let bound = 0;
    let morphArray = [];
    for (let i = 0; (1 > bound) || (i < length); i++) {
      if (influences[i] > 0) {
        bound++;
        morphArray.push([i, influences[i]]);
      }
    }
    morphArray.sort(absNumericalSort);
    if (morphArray.length == 2) {
      targetGeometry.addAttribute('morphColor0', morphColors[ morphArray[0][0] ] );
      targetGeometry.addAttribute('morphColor1', morphColors[ morphArray[1][0] ] );
    } else if (morphArray.length == 1) {
      targetGeometry.addAttribute('morphColor0', morphColors[ morphArray[0][0] ] );
      targetGeometry.addAttribute('morphColor1', morphColors[ morphArray[0][0] ] );
    }
  }
}

/**
 * Set the local time of this geometry.
 * 
 * @param {Number} time - Can be any value between 0 to duration.
 */
ZincObject.prototype.setMorphTime = function(time) {
  let timeChanged = false;
  if (this.clipAction) {
    const ratio = time / this.duration;
    const actualDuration = this.clipAction._clip.duration;
    let newTime = ratio * actualDuration;
    if (newTime != this.clipAction.time) {
      this.clipAction.time = newTime;
      timeChanged = true;
    }
    if (this.clipAction.time > actualDuration)
      this.clipAction.time = actualDuration;
    if (this.clipAction.time < 0.0)
      this.clipAction.time = 0.0;
    if (timeChanged && this.timeEnabled == 1)
      this.mixer.update( 0.0 );
  } else {
    let newTime = time; 
    if (time > this.duration)
      newTime = this.duration;
    else if (0 > time)
      newTime = 0;
    else
      newTime = time;
    if (newTime != this.inbuildTime) {
      this.inbuildTime = newTime;
      timeChanged = true;
    }
  }
  if (timeChanged)
    updateMorphColorAttribute(this.geometry, this.morph);
}

/**
 * Check if the geometry is time varying.
 * 
 * @return {Boolean}
 */
ZincObject.prototype.isTimeVarying = function() {
  if (this.timeEnabled || this.morphColour)
    return true;
  return false;
}

/**
 * Get the visibility of this Geometry.
 * 
 */
ZincObject.prototype.getVisibility = function() {
  return this.morph.visible;
}

/**
 * Set the visibility of this Geometry.
 * 
 * @param {Boolean} visible - a boolean flag indicate the visibility to be set 
 */
ZincObject.prototype.setVisibility = function(visible) {
  this.morph.visible = visible;
}

/**
 * Set the opacity of this Geometry. This function will also set the isTransparent
 * flag according to the provided alpha value.
 * 
 * @param {Number} alpah - Alpha value to set for this geometry, 
 * can be any value between from 0 to 1.0.
 */
ZincObject.prototype.setAlpha = function(alpha) {
  const material = this.morph.material;
  let isTransparent = false;
  if (alpha  < 1.0)
    isTransparent = true;
  material.transparent = isTransparent;
  material.opacity = alpha;
}

ZincObject.prototype.setFrustumCulled = function(flag) {
  if (this.morph)
    this.morph.frustumCulled = flag;
}

ZincObject.prototype.setVertexColors = function(vertexColors) {
  this.morph.material.vertexColors = vertexColors;
  this.geometry.colorsNeedUpdate = true;
}
  
/**
 * Set the colour of the geometry.
 * 
 * @param {THREE.Color} colour - Colour to be set for this geometry.
 */
ZincObject.prototype.setColour = function(colour) {
  this.morph.material.color = colour;
  this.geometry.colorsNeedUpdate = true;
}

ZincObject.prototype.getColourHex = function() {
  if (!this.morphColour)
    return this.morph.material.color.getHexString();
  return undefined;
}

ZincObject.prototype.setColourHex = function(hex) {
  this.morph.material.color.setHex(hex);
}

/**
 * Set the material of the geometry.
 * 
 * @param {THREE.Material} material - Material to be set for this geometry.
 */
ZincObject.prototype.setMaterial = function(material) {
  this.morph.material = material;
  this.geometry.colorsNeedUpdate = true;
}

/**
 * Get the bounding box of this geometry.
 * 
 * @return {THREE.Box3}.
 */
ZincObject.prototype.getBoundingBox = function() {
  if (this.morph && this.morph.visible) {
    //var boundingBox = new THREE.Box3().setFromObject(this.morph);
    //return boundingBox;
    let influences = this.morph.morphTargetInfluences;
    let attributes = this.morph.geometry.morphAttributes;
    if (influences && attributes && attributes.position) {
      let min = new THREE.Vector3();
      let max = new THREE.Vector3();
      let found = false;
      for (let i = 0; i < influences.length; i++) {
        if (influences[i] > 0) {
          found = true;
          let box = new THREE.Box3().setFromArray(
            attributes.position[i].array);
          min.add(box.min.multiplyScalar(influences[i]));
          max.add(box.max.multiplyScalar(influences[i]));
        }
      }
      if (found) {
        let boundingBox = new THREE.Box3(min, max);
        return boundingBox;
      }
    }
    var boundingBox = new THREE.Box3().setFromObject(this.morph);
    return boundingBox;
  }
  return undefined;
}

/**
 * Clear this geometry and free the memory.
 */
ZincObject.prototype.dispose = function() {
  if (this.morph && this.morph.geometry)
    this.morph.geometry.dispose();
  if (this.morph && this.morph.material)
    this.morph.material.dispose();
  this.geometry = undefined;
  this.mixer = undefined;
  this.morph = undefined;
  this.clipAction = undefined;
  this.groupName = undefined;
}

ZincObject.prototype.updateMarker = function(playAnimation, options) {
  if (playAnimation == true || 
    (false == (options && options.displayMarkers)))
  {
    if (this.marker) {
      this.marker.disable();
    }
    this.markerUpdateRequired = true;  
  } else {
    if (this.groupName) {
      if (!this.marker) {
        this.marker = new (require("../marker").Marker)(this);
        this.markerUpdateRequired = true;
      }
      if (this.markerUpdateRequired) {
        this.markerUpdateRequired = false;
        this.marker.enable();
        //Remove the marker to get the accurate box
        this.morph.remove(this.marker.graphicsObject);
        let center = new THREE.Vector3();
        this.getBoundingBox().getCenter(center);
        this.marker.setPosition(center.x, center.y, center.z);
        this.morph.add(this.marker.graphicsObject);
      }
    }
  }
  if (this.marker && this.marker.isEnabled() && 
    options && options.camera && options.displayMarkers) {
    this.marker.updateDistanceBasedOpacity(options.camera.cameraObject);
  }
}

//Update the geometry and colours depending on the morph.
ZincObject.prototype.render = function(delta, playAnimation, options) {
  if (playAnimation == true) 
  {
    if ((this.clipAction) && (this.timeEnabled == 1)) {
      this.mixer.update( delta );
    }
    else {
      let targetTime = this.inbuildTime + delta;
      if (targetTime > this.duration)
        targetTime = targetTime - this.duration;
      this.inbuildTime = targetTime;
    }
    if (delta != 0 && this.morphColour == 1) {
      if (typeof this.geometry !== "undefined") {
        
        if (this.morph.material.vertexColors == THREE.VertexColors)
        {
          updateMorphColorAttribute(this.geometry, this.morph);
        }	
      }
    }
  }
  this.updateMarker(playAnimation, options);
}

exports.ZincObject = ZincObject;
