const { Group, Matrix4 } = require('three');

let Region = function (parentIn) {
  let parent = parentIn;
  let group = new Group();
  group.matrixAutoUpdate = false;
  group.userData = this;
  let children = [];
  let name = "";
  let zincObjects = [];
  const tMatrix = new Matrix4();
  let duration = 3000;
  tMatrix.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  this.pickableUpdateRequired = true;

  this.hideAllPrimitives = () => {
    children.forEach(child => child.hideAllPrimitives());
    zincObjects.forEach(zincObject => zincObject.setVisibility(false));
  }

  this.showAllPrimitives = () => {
    children.forEach(child => child.showAllPrimitives());
    zincObjects.forEach(zincObject => zincObject.setVisibility(true));
  }

  /***
   * Set the visibility and propagate it up and down the hierarchies
   * depending on the flag
  */
  this.setVisibility = (flag) => {
    group.visible = flag;
  }

  this.getVisibility = () => {
    return group.visible;
  }

  this.getGroup = () => {
    return group;
  }

  this.setTransformation = transformation => {
    tMatrix.set(...transformation);
    group.matrix.copy(tMatrix);
    group.updateMatrixWorld();
  }

  this.setName = (nameIn) => {
    if (nameIn && nameIn !== "") {
      name = nameIn;
    }
  }

  this.getName = () => {
    return name;
  }

  this.getParent = () => {
    return parent;
  }

  //This function returns the full path until it reaches the root
  this.getFullSeparatedPath = () => {
    const paths = [];
    if (name !== "") {
      paths.push(name);
      for (let p = parent; p !== undefined;) {
        const parentName = p.getName();
        if (parentName !== "") {
          paths.unshift(parentName);
        }
        p = p.getParent();
      }
    }
    return paths;
  }

  //This function returns the full path until it reaches the root
  this.getFullPath = () => {
    const paths = this.getFullSeparatedPath();
    if (paths.length > 0) {
      let fullPath = paths.shift();
      paths.forEach(path => {
        fullPath = fullPath.concat("/", path);
      });
      return fullPath;
    }
    return "";
  }

  this.createChild = (nameIn) => {
    let childRegion = new Region(this);
    childRegion.setName(nameIn);
    children.push(childRegion);
    group.add(childRegion.getGroup());
    return childRegion;
  }

  this.getChildWithName = childName => {
    if (childName) {
      for (let i = 0; i < children.length; i++) {
        if (children[i].getName() === childName)
          return children[i];
      }
    }
    return undefined;
  }

  this.findChildFromSeparatedPath = pathArray => {
    if (pathArray && pathArray.length > 0) {
      if (pathArray[0] === "") {
        pathArray.shift();
      }
    }
    if (pathArray && pathArray.length > 0) {
      const childRegion = this.getChildWithName(pathArray[0]);
      if (childRegion) {
        pathArray.shift();
        return childRegion.findChildFromSeparatedPath(pathArray);
      } else {
        return undefined;
      }
    }
    return this;
  }

  this.findChildFromPath = (path) => {
    const pathArray = path.split("/");
    return this.findChildFromSeparatedPath(pathArray);
  }

  this.createChildFromSeparatedPath = pathArray => {
    if (pathArray.length > 0) {
      if (pathArray[0] === "") {
        pathArray.shift();
      }
    }
    if (pathArray.length > 0) {
      let childRegion = this.getChildWithName(pathArray[0]);
      if (!childRegion) {
        childRegion = this.createChild(pathArray[0]);
      }
      pathArray.shift();
      return childRegion.createChildFromSeparatedPath(pathArray);
    }
    return this;
  }

  this.createChildFromPath = (path) => {
    const pathArray = path.split("/");
    return this.createChildFromSeparatedPath(pathArray);
  }

  this.findOrCreateChildFromPath = (path) => {
    let childRegion = this.findChildFromPath(path);
    if (!childRegion) {
      childRegion = this.createChildFromPath(path);
    }
    return childRegion;
  }

  this.addZincObject = zincObject => {
    if (zincObject) {
      zincObject.setRegion(this);
      group.add(zincObject.morph);
      zincObjects.push(zincObject);
      this.pickableUpdateRequired = true;
    }
  }

  /**
   * Remove a ZincObject from this region if it presents. This will eventually
   * destroy the object and free up the memory.
   * @param {Zinc.Object} zincObject - object to be removed from this region.
   */
  this.removeZincObject = zincObject => {
    for (let i = 0; i < zincObjects.length; i++) {
      if (zincObject === zincObjects[i]) {
        group.remove(zincObject.morph);
        zincObjects.splice(i, 1);
        zincObject.dispose();
        return;
      }
    }
  }

  this.checkPickableUpdateRequred = (transverse) => {
    if (this.pickableUpdateRequired) return true;
    if (transverse) {
      let flag = false;
      for (let i = 0; i < children.length; i++) {
         flag = children[i].checkPickableUpdateRequred(transverse);
         if (flag) return true;
      }
    }
    return false;
  }

  /**
   * Get all pickable objects.
   */
  this.getPickableThreeJSObjects = (objectsList, pickMarkers, transverse) => {
    zincObjects.forEach(zincObject => {
      if (zincObject.morph && zincObject.morph.visible) {
        if (pickMarkers) {
          let marker = zincObject.marker;
          if (marker && marker.isEnabled()) {
            objectsList.push(marker.morph);
          }
        } else {
          objectsList.push(zincObject.morph);
        }
      }
    });
    if (transverse) {
      children.forEach(childRegion => {
        childRegion.getPickableThreeJSObjects(objectsList, pickMarkers,
          transverse);
      });
    }
    this.pickableUpdateRequired = false;
    return objectsList;
  }

  /**
   * Set the default duration value for all zinc objects
   * that are to be loaded into this region.
   * @param {Number} durationIn - duration of the scene.
   */
  this.setDuration = durationIn => {
    duration = durationIn;
    zincObjects.forEach(zincObject => zincObject.setDuration(durationIn));
    children.forEach(childRegion => childRegion.setDuration(durationIn));
  }

  /**
   * Get the default duration value.
   * returns {Number}
   */
  this.getDuration = () => {
    return duration;
  }

  /**
   * Get the bounding box of all the object in this and child regions only.
   * 
   * @returns {THREE.Box3} 
   */
  this.getBoundingBox = transverse => {
    let boundingBox1 = undefined, boundingBox2 = undefined;
    zincObjects.forEach(zincObject => {
      boundingBox2 = zincObject.getBoundingBox();
      if (boundingBox2) {
        if (boundingBox1 == undefined) {
          boundingBox1 = boundingBox2.clone();
        } else {
          boundingBox1.union(boundingBox2);
        }
      }
    });
    if (boundingBox1)
      boundingBox1.applyMatrix4(group.matrixWorld);
    if (transverse) {
      children.forEach(childRegion => {
        boundingBox2 = childRegion.getBoundingBox(transverse);
        if (boundingBox2) {
          if (boundingBox1 == undefined) {
            boundingBox1 = boundingBox2.clone();
          } else {
            boundingBox1.union(boundingBox2);
          }
        }
      });
    }
    return boundingBox1;
  }

  this.clear = transverse => {
    if (transverse) {
      children.forEach(childRegion => childRegion.clear(transverse));
    }
    zincObjects.forEach(zincObject => {
      group.remove(zincObject.morph);
      zincObject.dispose();
    });
    children = [];
    zincObjects = [];
  }

  this.objectIsInRegion = (zincObject, transverse) => {
    for (let i = 0; i < zincObjects.length; i++) {
      if (zincObject === zincObjects[i]) {
        return true;
      }
    }
    if (transverse) {
      for (let i = 0; i < children.length; i++) {
        if (children[i].objectIsInRegion())
          return true;
      }
    }

    return false;
  }

  /**
   * A function which iterates through the list of geometries and call the callback
   * function with the geometries as the argument.
   * @param {Function} callbackFunction - Callback function with the geometry
   * as an argument.
   */
  this.forEachGeometry = (callbackFunction, transverse) => {
    zincObjects.forEach(zincObject => {
      if (zincObject.isGeometry)
        callbackFunction(zincObject);
    });
    if (transverse)
      children.forEach(childRegion => childRegion.forEachGeometry(
        callbackFunction, transverse));
  }

  /**
   * A function which iterates through the list of glyphsets and call the callback
   * function with the glyphset as the argument.
   * @param {Function} callbackFunction - Callback function with the glyphset
   * as an argument.
   */
  this.forEachGlyphset = (callbackFunction, transverse) => {
    zincObjects.forEach(zincObject => {
      if (zincObject.isGlyphset)
        callbackFunction(zincObject);
    });
    if (transverse)
      children.forEach(childRegion => childRegion.forEachGlyphset(
        callbackFunction, transverse));
  }

  /**
   * A function which iterates through the list of pointsets and call the callback
   * function with the pointset as the argument.
   * @param {Function} callbackFunction - Callback function with the pointset
   * as an argument.
   */
  this.forEachPointset = (callbackFunction, transverse) => {
    zincObjects.forEach(zincObject => {
      if (zincObject.isPointset)
        callbackFunction(zincObject);
    });
    if (transverse)
      children.forEach(childRegion => childRegion.forEachPointset(
        callbackFunction, transverse));
  }

  /**
  * A function which iterates through the list of lines and call the callback
  * function with the lines as the argument.
  * @param {Function} callbackFunction - Callback function with the lines
  * as an argument.
  */
  this.forEachLine = (callbackFunction, transverse) => {
    zincObjects.forEach(zincObject => {
      if (zincObject.isLines)
        callbackFunction(zincObject);
    });
    if (transverse)
      children.forEach(childRegion => childRegion.forEachLine(
        callbackFunction, transverse));
  }

  this.findObjectsWithAnatomicalId = (anatomicalId, transverse) => {
    zincObjects.forEach(zincObject => {
      if (zincObject.anatomicalId === anatomicalId)
        objectsArray.push(zincObject);
    });
    if (transverse) {
      children.forEach(childRegion => {
        let childObjects = childRegion.findObjectsWithAnatomicalId(anatomicalId, transverse);
        objectsArray.push(...childObjects);
      });
    }

    return objectsArray;
  }

  /** 
   * Find and return all zinc objects in this and child regions with 
   * the matching GroupName.
   * 
   * @param {String} groupName - Groupname to match with.
   * @returns {Array}
   */
  this.findObjectsWithGroupName = (groupName, transverse) => {
    const objectsArray = [];
    zincObjects.forEach(zincObject => {
      if (zincObject.groupName === groupName)
        objectsArray.push(zincObject);
    });
    if (transverse) {
      children.forEach(childRegion => {
        let childObjects = childRegion.findObjectsWithGroupName(groupName, transverse);
        objectsArray.push(...childObjects);
      });
    }
    return objectsArray;
  }

  /** 
   * Find and return all geometries in this and child regions with 
   * the matching GroupName.
   * 
   * @param {String} groupName - Groupname to match with.
   * @returns {Array}
   */
  this.findGeometriesWithGroupName = (groupName, transverse) => {
    const primitivesArray = this.findObjectsWithGroupName(groupName, transverse);
    const geometriesArray = primitivesArray.filter(primitive => primitive.isGeometry);
    return geometriesArray;
  }

  /** 
   * Find and return all pointsets in this and child regions with
   * the matching groupName.
   * 
   * @param {String} groupName - Groupname to match with.
   * @returns {Array}
   */
  this.findPointsetsWithGroupName = (groupName, transverse) => {
    const primitivesArray = this.findObjectsWithGroupName(groupName, transverse);
    const pointsetsArray = primitivesArray.filter(primitive => primitive.isPointset);
    return pointsetsArray;
  }

  /** 
   * Find and return all glyphsets in this and child regions with
   * the matching groupName.
   * 
   * @param {String} groupName - Groupname to match with.
   * @returns {Array}
   */
  this.findGlyphsetsWithGroupName = (groupName, transverse) => {
    const primitivesArray = this.findObjectsWithGroupName(groupName, transverse);
    const glyphsetsArray = primitivesArray.filter(primitive => primitive.isGlyphset);
    return glyphsetsArray;
  }

  /** 
   * Find and return all lines in this and child regions with
   * the matching groupName.
   * 
   * @param {String} groupName - Groupname to match with.
   * @returns {Array}
   */
  this.findLinesWithGroupName = (groupName, transverse) => {
    const primitivesArray = this.findObjectsWithGroupName(groupName, transverse);
    const linesArray = primitivesArray.filter(primitive => primitive.isLines);
    return linesArray;
  }

  /** 
   * Find and return all lines in this and child regions with
   * the matching groupName.
   * 
   * @param {String} groupName - Groupname to match with.
   * @returns {Array}
   */
  this.getAllObjects = transverse => {
    const objectsArray = [...zincObjects];
    children.forEach(childRegion => {
      let childObjects = childRegion.getAllObjects(transverse);
      objectsArray.push(...childObjects);
    });
    return objectsArray;
  }

  /**
   * Get the current time of the region.
   * Return -1 if no graphics in the region.
   * @return {Number}
   */
  this.getCurrentTime = () => {
    if (zincObjects[0] != undefined) {
      return zincObjects[0].getCurrentTime();
    } else {
      for (let i = 0; i < children.length; i++) {
        const time = children[i].getCurrentTime();
        if (time !== -1)
          return time;
      }
    }
    return -1;
  }

  /**
   * Set the current time of all the objects of this region.
   * @param {Number} time  - Value to set the time to.
   */
  this.setMorphTime = (time, transverse) => {
    zincObjects.forEach(zincObject => {
      zincObject.setMorphTime(time);
    });
    if (transverse) {
      children.forEach(childRegion => {
        childRegion.setMorphTime(time);
      });
    }
  }

  /**
   * Check if any object in this region is time varying.
   * 
   * @return {Boolean}
   */
  this.isTimeVarying = () => {
    for (let i = 0; i < zincObjects.length; i++) {
      if (zincObjects[i].isTimeVarying()) {
        return true;
      }
    }
    for (let i = 0; i < children.length; i++) {
      if (children[i].isTimeVarying()) {
        return true;
      }
    }

    return false;
  }

  /**
   * Update geometries and glyphsets based on the calculated time.
   * @private
   */
  this.renderGeometries = (playRate, delta, playAnimation, options, transverse) => {
    // Let video dictates the progress if one is present
    const allObjects = this.getAllObjects(transverse);
    allObjects.forEach(zincObject => {
      zincObject.render(playRate * delta, playAnimation, options);
    });
    //process markers visibility and size
    if (options && options.displayMarkers && (playAnimation === false)) {
      if (options.markerDepths.length > 0) {
        const min = Math.min(...options.markerDepths);
        const max = Math.max(...options.markerDepths);
        allObjects.forEach(zincObject => {
          zincObject.processMarkerVisual(min, max, options);
        });
      }
    }
  }
}

exports.Region = Region;
