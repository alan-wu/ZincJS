const THREE = require('three');

function absNumericalSort( a, b ) {
	return Math.abs( b[ 1 ] ) - Math.abs( a[ 1 ] );
}

const ZincObject = function() {
  this.isZincObject = true;
  this.geometry = undefined;
  // THREE.Mesh
  this.morph = undefined;
  // THREE.Mesh - for utilities purpose such as rendering 
  // transparent surfaces - one for front face and one for back face.
  this.secondaryMesh = undefined;
  /**
	 * Groupname given to this geometry.
	 */
  this.groupName = undefined;
  this.timeEnabled = false;
  this.morphColour = false;
  this.inbuildTime = 0;
  this.mixer = undefined;
  this.animationGroup = undefined;
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
  this.markerVertexIndex = -1;
  this.boundingBoxUpdateRequired = true;
  this.cachedBoundingBox = new THREE.Box3();
  this._vertex = new THREE.Vector3();
}

ZincObject.prototype.setDuration = function(durationIn) {
  this.duration = durationIn;
  if (this.clipAction) {
    this.clipAction.setDuration(this.duration);
  }
}

ZincObject.prototype.getDuration = function() {
  return this.duration;
}

ZincObject.prototype.toBufferGeometry = function(geometryIn, options) {
  let geometry = undefined;
  if (geometryIn instanceof THREE.Geometry) {
    if (options.localTimeEnabled && (geometryIn.morphNormals == undefined || geometryIn.morphNormals.length == 0))
      geometryIn.computeMorphNormals();
    geometry = new THREE.BufferGeometry().fromGeometry(geometryIn);
    if (options.localMorphColour)
      require("../utilities").copyMorphColorsToBufferGeometry(geometryIn, geometry);
  } else if (geometryIn instanceof THREE.BufferGeometry) {
    geometry = new THREE.BufferGeometry();
    geometry.copy(geometryIn);
  }
  geometry.colorsNeedUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  if (geometryIn._video)
    geometry._video = geometryIn._video;
  return geometry;
}

ZincObject.prototype.checkAndCreateTransparentMesh = function(options) {
  if (this.isGeometry && this.morph.material.transparent) {
    if (!this.secondaryMesh) {
      let secondaryMaterial = this.morph.material.clone();
      secondaryMaterial.side =  THREE.FrontSide;
      this.secondaryMesh = new THREE.Mesh(this.morph.geometry, secondaryMaterial); 
      this.secondaryMesh.renderOrder = 2;
      this.secondaryMesh.userData = this;
      this.secondaryMesh.name = this.groupName;
    }
    this.morph.material.side = THREE.BackSide;
    this.morph.material.needsUpdate = true;
    this.morph.add(this.secondaryMesh);
    this.animationGroup.add(this.secondaryMesh);
  }
}

ZincObject.prototype.checkAndRemoveTransparentMesh = function() {
  if (this.isGeometry && this.secondaryMesh) {
    this.morph.remove(this.secondaryMesh);
    this.animationGroup.uncache(this.secondaryMesh);
    this.animationGroup.remove(this.secondaryMesh);
  }
  this.morph.material.side = THREE.DoubleSide;
}

ZincObject.prototype.setMesh = function(mesh, localTimeEnabled, localMorphColour) {
  this.animationGroup = new THREE.AnimationObjectGroup(mesh);
  this.mixer = new THREE.AnimationMixer(this.animationGroup);
  this.geometry = mesh.geometry;
  this.clipAction = undefined;
  if (this.geometry.morphAttributes.position) {
    let animationClip = THREE.AnimationClip.CreateClipsFromMorphTargetSequences(
      this.geometry.morphAttributes.position, 10, true);
    if (animationClip && (animationClip[0] != undefined)) {
      this.clipAction = this.mixer.clipAction(animationClip[0]).setDuration(
        this.duration);
      this.clipAction.loop = THREE.loopOnce;
      this.clipAction.clampWhenFinished = true;
      this.clipAction.play();
    }
  }
  this.timeEnabled = localTimeEnabled;
  this.morphColour = localMorphColour;
  this.morph = mesh;
  this.morph.userData = this;
  this.morph.matrixAutoUpdate = false;
  this.checkAndCreateTransparentMesh();
  if (this.timeEnabled) {
    this.setFrustumCulled(false);
  }
  this.boundingBoxUpdateRequired = true;
}

ZincObject.prototype.setName = function(groupNameIn) {
  this.groupName = groupNameIn;
  if (this.morph) {
    this.morph.name = this.groupName;
  }
  if (this.secondaryMesh) {
    this.secondaryMesh.name = this.groupName;
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
      targetGeometry.setAttribute('morphColor0', morphColors[ morphArray[0][0] ] );
      targetGeometry.setAttribute('morphColor1', morphColors[ morphArray[1][0] ] );
    } else if (morphArray.length == 1) {
      targetGeometry.setAttribute('morphColor0', morphColors[ morphArray[0][0] ] );
      targetGeometry.setAttribute('morphColor1', morphColors[ morphArray[0][0] ] );
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
  if (timeChanged) {
    this.boundingBoxUpdateRequired = true;
    updateMorphColorAttribute(this.geometry, this.morph);
    if (this.timeEnabled)
      this.markerUpdateRequired = true;
  }
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
  let transparentChanged = material.transparent == isTransparent ? false : true;
  material.opacity = alpha;
  material.transparent = isTransparent;
  if (transparentChanged)
    if (isTransparent)
      this.checkAndCreateTransparentMesh();
    else
      this.checkAndRemoveTransparentMesh();
  if (this.secondaryMesh && this.secondaryMesh.material)
    this.secondaryMesh.material.opacity = alpha;
}

ZincObject.prototype.setFrustumCulled = function(flag) {
  if (this.morph) {
    this.morph.frustumCulled = flag;
  }
}

ZincObject.prototype.setVertexColors = function(vertexColors) {
  this.morph.material.vertexColors = vertexColors;
  this.geometry.colorsNeedUpdate = true;
  if (this.secondaryMesh && this.secondaryMesh.material)
    this.secondaryMesh.material.vertexColors = vertexColors;
}

/**
 * Set the colour of the geometry.
 * 
 * @param {THREE.Color} colour - Colour to be set for this geometry.
 */
ZincObject.prototype.getColour = function(colour) {
  if (this.morph && this.morph.material)
    return this.morph.material.color;
	return undefined;
}
  
/**
 * Set the colour of the geometry.
 * 
 * @param {THREE.Color} colour - Colour to be set for this geometry.
 */
ZincObject.prototype.setColour = function(colour) {
  this.morph.material.color = colour;
  if (this.secondaryMesh && this.secondaryMesh.material)
    this.secondaryMesh.material.color = colour;
  this.geometry.colorsNeedUpdate = true;
}

ZincObject.prototype.getColourHex = function() {
  if (!this.morphColour)
    return this.morph.material.color.getHexString();
  return undefined;
}

ZincObject.prototype.setColourHex = function(hex) {
  this.morph.material.color.setHex(hex);
  if (this.secondaryMesh && this.secondaryMesh.material)
    this.secondaryMesh.material.setHex(hex);
}

/**
 * Set the material of the geometry.
 * 
 * @param {THREE.Material} material - Material to be set for this geometry.
 */
ZincObject.prototype.setMaterial = function(material) {
  this.morph.material = material;
  this.geometry.colorsNeedUpdate = true;
  if (this.secondaryMesh && this.secondaryMesh.material) {
    this.secondaryMesh.material.copy(material);
    this.secondaryMesh.material.side = THREE.FrontSide;
  }
}

/**
 * Get the index of the closest vertex to centroid.
 */
ZincObject.prototype.getClosestVertexIndex = function() {
  let closestIndex = -1;
  if (this.morph) {
    let position = this.morph.geometry.attributes.position;
    let boundingBox = new THREE.Box3().setFromBufferAttribute(position);
    let center = new THREE.Vector3();
    boundingBox.getCenter(center);
    if (position && boundingBox) {
      let distance = -1;
      let currentDistance = 0;
      let current = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        current.fromArray(position.array, i * 3);
        currentDistance = current.distanceTo(center);
        if (distance == -1)
          distance = currentDistance;
        else if (distance > (currentDistance)) {
          distance = currentDistance;
          closestIndex = i;
        }
      }
    }
  }
  return closestIndex;
}

/**
 * Get the  closest vertex to centroid.
 */
ZincObject.prototype.getClosestVertex = function() {
  let position = new THREE.Vector3();
  if (this.markerVertexIndex == -1) {
    this.markerVertexIndex = this.getClosestVertexIndex();
  }
  if (this.markerVertexIndex >= 0) {
    let influences = this.morph.morphTargetInfluences;
    let attributes = this.morph.geometry.morphAttributes;
    if (influences && attributes && attributes.position) {
      let found = false;
      for (let i = 0; i < influences.length; i++) {
        if (influences[i] > 0) {
          found = true;
          this._vertex.fromArray(
            attributes.position[i].array, this.markerVertexIndex * 3);
          position.add(this._vertex.multiplyScalar(influences[i]));
        }
      }
      if (found)
        return position;
    } else {
      position.fromArray(this.morph.geometry.attributes.position.array,
        this.markerVertexIndex * 3);
      return position;
    }
  }
  this.getBoundingBox().getCenter(position);
  return position;
}

/**
 * Get the bounding box of this geometry.
 * 
 * @return {THREE.Box3}.
 */
ZincObject.prototype.getBoundingBox = function() {
  if (this.morph && this.morph.visible) {
    if (this.boundingBoxUpdateRequired) {
      let influences = this.morph.morphTargetInfluences;
      let attributes = this.morph.geometry.morphAttributes;
      let found = false;
      if (influences && attributes && attributes.position) {
        let min = new THREE.Vector3();
        let max = new THREE.Vector3();
        let box = new THREE.Box3();
        for (let i = 0; i < influences.length; i++) {
          if (influences[i] > 0) {
            found = true;
            box.setFromArray(attributes.position[i].array);
            min.add(box.min.multiplyScalar(influences[i]));
            max.add(box.max.multiplyScalar(influences[i]));
          }
        }
        if (found)
          this.cachedBoundingBox.set(min, max);
      }
      if (!found)
        this.cachedBoundingBox.setFromBufferAttribute(
          this.morph.geometry.attributes.position);
      this.boundingBoxUpdateRequired = false;
    }
    return this.cachedBoundingBox;
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
  if (this.secondaryMesh && this.secondaryMesh.material)
    this.secondaryMesh.material.dispose();
  if (this.geometry)
    this.geometry.dispose();
  this.animationGroup = undefined;
  this.mixer = undefined;
  this.morph = undefined;
  this.clipAction = undefined;
  this.groupName = undefined;
}

ZincObject.prototype.updateMarker = function(playAnimation, options) {
  if ((playAnimation == false) &&
    ((options && options.displayMarkers)))
  {
    if (this.groupName) {
      if (!this.marker) {
        this.marker = new (require("./marker").Marker)(this);
        this.markerUpdateRequired = true;
      }
      if (this.markerUpdateRequired) {
        let position = this.getClosestVertex();
        if (position) {
          this.marker.setPosition(position.x, position.y, position.z);
          this.markerUpdateRequired = false;
        }
      }
      //if (options && options.camera) {
      //  this.marker.updateDistanceBasedOpacity(options.camera.cameraObject);
      //}
      if (!this.marker.isEnabled()) {
        this.marker.enable();
        this.morph.add(this.marker.morph);
      }
    }
  } else {
    if (this.marker && this.marker.isEnabled()) {
      this.marker.disable();
      this.morph.remove(this.marker.morph);
    }
    this.markerUpdateRequired = true;
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
    if (delta != 0) {
      this.boundingBoxUpdateRequired = true;
      if ((this.morphColour == 1) && (typeof this.geometry !== "undefined") &&
          (this.morph.material.vertexColors == THREE.VertexColors))
        updateMorphColorAttribute(this.geometry, this.morph);
    }
  }
  this.updateMarker(playAnimation, options);
}

exports.ZincObject = ZincObject;
