const THREE = require('three');
const THREEGeometry = require('../three/Geometry').Geometry;

/**
 * Provides the base object for other primitive types.
 * This class contains multiple base methods.
 * 
 * @class
 * @author Alan Wu
 * @return {ZincObject}
 */
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
	 * {@link Renderer#playRate} to produce the actual duration of the
	 * animation. Actual time in second = duration / playRate.
	 */
  this.duration = 6000;
  this.clipAction = undefined;
  this.userData = {};
  this.videoHandler = undefined;
  this.marker = undefined;
  this.markerUpdateRequired = true;
  this.closestVertexIndex = -1;
  this.boundingBoxUpdateRequired = true;
  this.cachedBoundingBox = new THREE.Box3();
  this._vertex = new THREE.Vector3();
  this.anatomicalId = undefined;
  this.region = undefined;
  this.animationClip = undefined;
}

/**
 * Set the duration of the animation of this object.
 * 
 * @param {Number} durationIn - Duration of the animation.
 */
ZincObject.prototype.setDuration = function(durationIn) {
  this.duration = durationIn;
  if (this.clipAction) {
    this.clipAction.setDuration(this.duration);
  }
}

/**
 * Get the duration of the animation of this object.
 * 
 * @return {Number}
 */
ZincObject.prototype.getDuration = function() {
  return this.duration;
}

/**
 * Set the region this object belongs to.
 * 
 * @param {Region} region
 */
ZincObject.prototype.setRegion = function(region) {
  this.region = region;
}

/**
 * Get the region this object belongs to.
 * 
 * @return {Region}
 */
ZincObject.prototype.getRegion = function() {
  return this.region;
}

/**
 * Convert a {THREE.Geometry} into a {THREE.BufferGeometry}.
 */
ZincObject.prototype.toBufferGeometry = function(geometryIn, options) {
  let geometry = undefined;
  if (geometryIn instanceof THREEGeometry) {
    if (options.localTimeEnabled && !geometryIn.morphNormalsReady && 
      (geometryIn.morphNormals == undefined || geometryIn.morphNormals.length == 0))
      geometryIn.computeMorphNormals();
    geometry = geometryIn.toIndexedBufferGeometry();
    if (options.localMorphColour) {
      require("../utilities").copyMorphColorsToIndexedBufferGeometry(geometryIn, geometry);
    }
  } else if (geometryIn instanceof THREE.BufferGeometry) {
    geometry = geometryIn.clone();
  }
  geometry.colorsNeedUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  if (geometryIn._video)
    geometry._video = geometryIn._video;
  return geometry;
}

/**
 * Handle transparent mesh, create a clone for backside rendering if it is
 * transparent.
 */
ZincObject.prototype.checkAndCreateTransparentMesh = function() {
  if (this.isGeometry && this.morph.material && this.morph.material.transparent) {
    if (!this.secondaryMesh) {
      let secondaryMaterial = this.morph.material.clone();
      secondaryMaterial.side =  THREE.FrontSide;
      this.secondaryMesh = new THREE.Mesh(this.morph.geometry, secondaryMaterial);
      this.secondaryMesh.renderOrder = this.morph.renderOrder + 1;
      this.secondaryMesh.userData = this;
      this.secondaryMesh.name = this.groupName;
    }
    this.morph.material.side = THREE.BackSide;
    this.morph.material.needsUpdate = true;
    this.morph.add(this.secondaryMesh);
    this.animationGroup.add(this.secondaryMesh);
  }
}

/**
 * Handle transparent mesh, remove a clone for backside rendering if it is
 * transparent.
 */
ZincObject.prototype.checkAndRemoveTransparentMesh = function() {
  if (this.isGeometry && this.secondaryMesh) {
    this.morph.remove(this.secondaryMesh);
    this.animationGroup.uncache(this.secondaryMesh);
    this.animationGroup.remove(this.secondaryMesh);
  }
  this.morph.material.side = THREE.DoubleSide;
}

/**
 * Set the mesh function for zincObject.
 * 
 * @param {THREE.Mesh} mesh - Mesh to be set for this zinc object.
 * @param {Boolean} localTimeEnabled - A flag to indicate either the mesh is
 * time dependent.
 * @param {Boolean} localMorphColour - A flag to indicate either the colour is
 * time dependent.
 */
ZincObject.prototype.setMesh = function(mesh, localTimeEnabled, localMorphColour) {
  this.animationGroup = new THREE.AnimationObjectGroup(mesh);
  this.mixer = new THREE.AnimationMixer(this.animationGroup);
  this.geometry = mesh.geometry;
  this.clipAction = undefined;
  if (this.geometry && this.geometry.morphAttributes) {
    let morphAttribute = this.geometry.morphAttributes.position;
    if (!morphAttribute) {
      morphAttribute = this.geometry.morphAttributes.color ?
        this.geometry.morphAttributes.color :
        this.geometry.morphAttributes.normal;
    }
    if (morphAttribute) {
      this.animationClip = THREE.AnimationClip.CreateClipsFromMorphTargetSequences(
        morphAttribute, 10, true);
      if (this.animationClip && (this.animationClip[0] != undefined)) {
        this.clipAction = this.mixer.clipAction(this.animationClip[0]).setDuration(
          this.duration);
        this.clipAction.loop = THREE.loopOnce;
        this.clipAction.clampWhenFinished = true;
        this.clipAction.play();
      }
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
  } else {
    if (this.morphColour) {
      this.geometry.setAttribute('morphTarget0', this.geometry.getAttribute( 'position' ) );
      this.geometry.setAttribute('morphTarget1', this.geometry.getAttribute( 'position' ) );
    }
  }
  this.boundingBoxUpdateRequired = true;
}

/**
 * Set the name for this ZincObject.
 * 
 * @param {String} groupNameIn - Name to be set.
 */
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
  if (morph && targetGeometry && targetGeometry.morphAttributes &&
    targetGeometry.morphAttributes[ "color" ]) {
    const morphColors = targetGeometry.morphAttributes[ "color" ];
    const influences = morph.morphTargetInfluences;
    const length = influences.length;
    targetGeometry.deleteAttribute( 'morphColor0' );
    targetGeometry.deleteAttribute( 'morphColor1' );
    let bound = 0;
    let morphArray = [];
    for (let i = 0; (1 > bound) || (i < length); i++) {
      if (influences[i] > 0) {
        bound++;
        morphArray.push([i, influences[i]]);
      }
    }
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
    if (timeChanged && this.isTimeVarying()) {
      this.mixer.update( 0.0 );
    }
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
  if (this.morph.visible !== visible) {
    this.morph.visible = visible;
    if (this.region) this.region.pickableUpdateRequired = true;
  }
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

/**
 * The rendering will be culled if it is outside of the frustrum
 * when this flag is set to true, it should be set to false if
 * morphing is enabled.
 * 
 * @param {Boolean} flag - Set frustrum culling on/off based on this flag.
 */
ZincObject.prototype.setFrustumCulled = function(flag) {
  if (this.morph) {
    this.morph.frustumCulled = flag;
  }
}

/**
 * Set rather a zinc object should be displayed using per vertex colour or
 * not.
 * 
 * @param {Boolean} vertexColors - Set display with vertex color on/off.
 */
ZincObject.prototype.setVertexColors = function(vertexColors) {
  this.morph.material.vertexColors = vertexColors;
  this.geometry.colorsNeedUpdate = true;
  if (this.secondaryMesh && this.secondaryMesh.material)
    this.secondaryMesh.material.vertexColors = vertexColors;
}

/**
 * Get the colour of the mesh.
 * 
 * @return {THREE.Color}
 */
ZincObject.prototype.getColour = function() {
  if (this.morph && this.morph.material)
    return this.morph.material.color;
	return undefined;
}
  
/**
 * Set the colour of the mesh.
 * 
 * @param {THREE.Color} colour - Colour to be set for this geometry.
 */
ZincObject.prototype.setColour = function(colour) {
  this.morph.material.color = colour;
  if (this.secondaryMesh && this.secondaryMesh.material)
    this.secondaryMesh.material.color = colour;
  this.geometry.colorsNeedUpdate = true;
}

/**
 * Get the colour of the mesh in hex string form.
 * 
 * @return {String}
 */
ZincObject.prototype.getColourHex = function() {
  if (!this.morphColour) {
    if (this.morph && this.morph.material && this.morph.material.color)
      return this.morph.material.color.getHexString();
  }
  return undefined;
}

/**
 * Set the colour of the mesh using hex in string form.
 * 
 * @param {String} hex - The colour value in hex form.
 */
ZincObject.prototype.setColourHex = function(hex) {
  this.morph.material.color.setHex(hex);
  if (this.secondaryMesh && this.secondaryMesh.material)
    this.secondaryMesh.material.color.setHex(hex);
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
    this.secondaryMesh.material.dispose();
    this.secondaryMesh.material = material.clone()
    this.secondaryMesh.material.side = THREE.FrontSide;
  }
}

/**
 * Get the index of the closest vertex to centroid.
 * 
 * @return {Number} - integer index in the array
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
 * 
 * @return {THREE.Vector3}
 */
ZincObject.prototype.getClosestVertex = function() {
  let position = new THREE.Vector3();
  if (this.closestVertexIndex == -1) {
    this.closestVertexIndex = this.getClosestVertexIndex();
  }
  if (this.closestVertexIndex >= 0) {
    let influences = this.morph.morphTargetInfluences;
    let attributes = this.morph.geometry.morphAttributes;
    if (influences && attributes && attributes.position) {
      let found = false;
      for (let i = 0; i < influences.length; i++) {
        if (influences[i] > 0) {
          found = true;
          this._vertex.fromArray(
            attributes.position[i].array, this.closestVertexIndex * 3);
          position.add(this._vertex.multiplyScalar(influences[i]));
        }
      }
      if (found)
        return position;
    } else {
      position.fromArray(this.morph.geometry.attributes.position.array,
        this.closestVertexIndex * 3);
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
      let attributes = undefined;
      if (this.morph.geometry)
        attributes = this.morph.geometry.morphAttributes;
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
      this.cachedBoundingBox.applyMatrix4(this.morph.matrix);
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

/**
 * Update the marker's position and size based on current viewport. 
 */
ZincObject.prototype.updateMarker = function(playAnimation, options) {
  if ((playAnimation == false) &&
    (options && options.displayMarkers))
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
      if (options && options.camera && options.markerDepths) {
        options.markerDepths.push(
          this.marker.updateNDC(options.camera.cameraObject));
      }
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

ZincObject.prototype.processMarkerVisual = function(min, max) {
  if (this.marker && this.marker.isEnabled()) {
    this.marker.updateVisual(min, max);
  }
}

ZincObject.prototype.initiateMorphColor = function() {
  if ((this.morphColour == 1) && (typeof this.geometry !== "undefined") &&
      ((this.morph.material.vertexColors == THREE.VertexColors) ||
      (this.morph.material.vertexColors == true))) {
        updateMorphColorAttribute(this.geometry, this.morph);
      }
}

ZincObject.prototype.setRenderOrder = function(renderOrder) {
  if (this.morph && (renderOrder !== undefined)) {
    this.morph.renderOrder = renderOrder;
    if (this.secondaryMesh)
      this.secondaryMesh.renderOrder = this.morph.renderOrder + 1;
  }
}

/**
 * Get the windows coordinates.
 * 
 * @return {Object} - position and rather the closest vertex is on screen.
 */
ZincObject.prototype.getClosestVertexDOMElementCoords = function(scene) {
  if (scene && scene.camera) {
    let inView = true;
    const position = this.getClosestVertex();
    position.project(scene.camera);
    position.z = Math.min(Math.max(position.z, 0), 1);
    if (position.x > 1 || position.x < -1 || position.y > 1 || position.y < -1) {
      inView = false;
    }
    scene.getZincCameraControls().getRelativeCoordsFromNDC(position.x, position.y, position);
    return {position, inView};
  } else {
    return undefined;
  }
}

//Update the geometry and colours depending on the morph.
ZincObject.prototype.render = function(delta, playAnimation, options) {
  if (playAnimation == true)
  {
    if ((this.clipAction) && this.isTimeVarying()) {
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
         ((this.morph.material.vertexColors == THREE.VertexColors) ||
         (this.morph.material.vertexColors == true)))
        updateMorphColorAttribute(this.geometry, this.morph);
    }
  }
  this.updateMarker(playAnimation, options);
}

exports.ZincObject = ZincObject;
