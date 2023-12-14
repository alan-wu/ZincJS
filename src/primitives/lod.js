const THREE = require('three');
const updateMorphColorAttribute = require("../utilities").updateMorphColorAttribute;
const toBufferGeometry = require('../utilities').toBufferGeometry;

/**
 * Provides an object which stores meshes at different levels based
 * on specified distance.
 * This object is ued by zincObject to provide mesh at different LODs.
 * A layer is displayed when the distance from the camera is greater 
 * than its specified distance and closest compared to other layers.
 * This is intended to be an internal object used only by Zinc Object.
 * 
 * This object assumes the centroid and bounding box are consistent between
 * different level of layers.
 * 
 * @class
 * @author Alan Wu
 * @return {LOD}
 */
const LOD = function (parent) {
  this.levels = [];
  this._currentLevel = 0;
  this._renderOrder = 1;
  this._material = undefined;
  this._secondaryMaterial = undefined;
  this._loader = undefined;
  //The owning Zinc Object
  this._parent = parent;


  /*
   * Add a level of LOD at the specified distance
   */
  this.addLevel = (object, distanceIn) => {
    if (object) {
      const distance = Math.abs(distanceIn);
      let l;
      for (l = 0; l < this.levels.length; l++) {
        if (distance < this.levels[l].distance) {
          break;
        }
      }
      const levelObject = {
        distance: distance,
        morph: object,
        loaded: true,
        loading: false,
        url: "",
      };
      this.levels.splice(l, 0, levelObject);
      object.renderOrder = this._renderOrder;
      //this.add( object );
    }
  }

  /*
   * This is called once an ondemand level is loaded
   */
  this.levelLoaded = (object, distanceIn) => {
    if (object) {
      const distance = Math.abs(distanceIn);
      let l;
      for (l = 0; l < this.levels.length; l++) {
        if (distance === this.levels[l].distance) {
          this._parent.group.add(object);
          this.levels[l].morph = object;
          this.levels[l].loaded = true;
          this.levels[l].loading = false;
          break;
        }
      }
    }
  }

  this.addLevelFromURL = (loader, level, url, preload) => {
    this._loader = loader;
    const distance = this.calculateDistance(level);
    const levelObject = {
      distance: distance,
      morph: undefined,
      loaded: false,
      loading: false,
      url: url,
    };
    for (l = 0; l < this.levels.length; l++) {
      if (distance < this.levels[l].distance) {
        break;
      }
    }
    this.levels.splice(l, 0, levelObject);
    if (preload) {
      this.loadLevel(l);
    }
  }

  //load the mesh at index, return true if morph is not ready
  this.loadLevel = (index) => {
    const level = this.levels[index];
    if (!level.morph && !level.loaded &&
      !level.loading) {
      level.loading = true;
      this._loader.load(level.url, this.lodLoader(level.distance),
        undefined, undefined);
    }
    return (level.morph === undefined);
  }


  this.calculateDistance = function (level) {
    this._parent.getBoundingBox();
    const radius = this._parent.radius;
    let distance = 0;
    if (level === "far") {
      distance = radius * 4.5;
    } else if (level === "medium") {
      distance = radius * 2.5;
    } else if (level === "close") {
      distance = 0;
    }
    return distance;
  }

  /**
   * Check if there are multiple levels.
   */
  this.containsLevels = () => {
    if (this.levels && this.levels.length > 1) {
      return true;
    }
    return false;
  }

  /**
   * Check if material is transparent, create secondary mesh
   * for better rendering if required.
   */
  this.checkTransparentMesh = (animationGroup, transparentChanged) => {
    const level = this.levels[this._currentLevel];
    if (this._material) {
      if (this._material.transparent) {
        if (!this._secondaryMaterial) {
          this._secondaryMaterial = this._material.clone();
          this._secondaryMaterial.side = THREE.FrontSide;
        }
        this._secondaryMaterial.opacity = this._material.opacity;
        // THREE.Mesh - for utilities purpose such as rendering 
        // transparent surfaces - one for front face and one for back face.
        if (!level.secondaryMesh) {
          level.secondaryMesh = new THREE.Mesh(level.morph.geometry,
            this._secondaryMaterial);
          level.secondaryMesh.renderOrder = level.morph.renderOrder + 1;
          level.secondaryMesh.userData = level.morph.userData;
          level.secondaryMesh.name = level.morph.name;
        }
        if (transparentChanged) {
          this._material.side = THREE.BackSide;
          this._material.needsUpdate = true;
          level.morph.add(level.secondaryMesh);
          animationGroup.add(level.secondaryMesh);
        }
      } else {
        if (level.secondaryMesh) {
          //Do not delete this mesh, remove it from
          //rendering and animation group instead
          level.morph.remove(level.secondaryMesh);
          animationGroup.uncache(level.secondaryMesh);
          animationGroup.remove(level.secondaryMesh);
        }
        this._material.side = THREE.DoubleSide;
      }
    }
  }

  this.dispose = () => {
    this.levels.forEach((level) => {
      if (level.morph && level.morph.geometry) {
        level.morph.geometry.dispose();
      }
    });
    if (this._material) {
      this._material.dispose();
    }
    if (this._secondaryMaterial) {
      this._secondaryMaterial.dispose();
    }
  }

  this.getCurrentLevel = () => {
    return this._currentLevel;
  }

  this.getCurrentMorph = () => {
    const level = this.levels[this._currentLevel];
    if (level && level.morph) {
      return level.morph;
    }
    return this._parent.morph;
  }

  /**
 * Loader for lod object
 */
  this.lodLoader = function (distance) {
    return (geometryIn) => {
      const material = this._material;
      const options = {
        localTimeEnabled: this._parent.timeEnabled,
        localMorphColour: this._parent.morphColour,
      }
      const geometry = toBufferGeometry(geometryIn, options);
      const mesh = new THREE.Mesh(geometry, material);
      geometryIn.dispose();
      this.levelLoaded(mesh, distance);
    };
  }

  this.updateMorphColorAttribute = (currentOnly) => {
    //Multilayers - set all
    if (this._material) {
      if ((this._material.vertexColors == THREE.VertexColors) ||
        (this._material.vertexColors == true)) {
        if (currentOnly) {
          const morph = this.getCurrentMorph();
          updateMorphColorAttribute(morph.geometry, morph);
        } else {
          this.levels.forEach((level) => {
            if (level.morph && level.morph.geometry) {
              updateMorphColorAttribute(level.morph.geometry, level.morph);
            }
          });
        }
      }
    }
  }

  this.setColour = (colour) => {
    this._material.color = colour;
    if (this._secondaryMaterial) {
      this._secondaryMaterial.color = colour;
    }
    updateGeometryColour();
  }

  this.setFrustumCulled = (flag) => {
    this.levels.forEach((level) => {
      if (level.morph) {
        level.morph.frustumCulled = flag;
      }
      if (level.secondaryMesh) {
        level.secondaryMesh.frustumCulled = flag;
      }
    });
  }

  this.setMaterial = (material) => {
    if (material) {
      if (!this._material || (this._material.id !== material.id)) {
        this._material = material;
        if (this._secondaryMaterial) {
          this._secondaryMaterial.dispose();
          this._secondaryMaterial = material.clone()
          this._secondaryMaterial.side = THREE.FrontSide;
        }
        this.levels.forEach((level) => {
          if (level.morph) {
            level.morph.material = this._material;
            if (level.morph.geometry) {
              level.morph.geometry.colorsNeedUpdate = true;
            }
          }
          if (level.secondaryMesh) {
            level.secondaryMesh.material = this._secondaryMaterial;
          }
        });
      }
    }
  }

  this.setName = (name) => {
    this.levels.forEach((level) => {
      if (level.morph) {
        level.morph.name = name;
      }
      if (level.secondaryMesh) {
        level.secondaryMesh.name = name;
      }
    });
  }

  this.setRenderOrder = (order) => {
    this._renderOrder = order;
    this.levels.forEach((level) => {
      if (level.morph) {
        level.morph.renderOrder = order;
      }
      if (level.secondaryMesh) {
        level.secondaryMesh.renderOrder = order;
      }
    });
  }

  this.setVertexColors = (vertexColors) => {
    this._material.vertexColors = vertexColors;
    updateGeometryColour();
    if (this._secondaryMaterial) {
      this._secondaryMaterial.vertexColors = vertexColors;
    }
  }

  /* Update layers based on the */
  this.update = (camera, center) => {
    const levels = this.levels;
    if (levels.length > 1) {
      const distance = camera.cameraObject.position.distanceTo(center);
      let visibleIndex = -1;
      let optimalIndex = -1;
      let i, l;
      //Found a visible index that is within range of the LOD
      for (i = 0, l = levels.length; i < l; i++) {
        if (distance >= levels[i].distance) {
          //Check if a level is loading
          if (levels[i].morph) {
            if (visibleIndex > -1 && levels[visibleIndex].morph) {
              levels[visibleIndex].morph.visible = false;
            }
            visibleIndex = i;
            levels[i].morph.visible = true;
            optimalIndex = -1;
          }
          else {
            optimalIndex = i;
          }
        } else {
          break;
        }
      }
      if (optimalIndex > -1) {
        this.loadLevel(optimalIndex);
      }
      for (; i < l; i++) {
        if (levels[i].morph) {
          //Set visibility of other morph to false
          //and set the closest lod to true if
          //none is found
          if (visibleIndex > -1) {
            levels[i].morph.visible = false;
          } else {
            levels[i].morph.visible = true;
            visibleIndex = i;
          }
        }
      }
      this._currentLevel = visibleIndex;
    }
  }

  this.toggleMarker = (marker, flag) => {
    this.levels.forEach((level) => {
      if (level.morph) {
        if (flag) {
          level.morph.add(marker);
        } else {
          level.morph.remove(marker);
        }
      }
    });
  }

  updateGeometryColour = () => {
    this.levels.forEach((level) => {
      if (level.morph && level.morph.geometry) {
        level.morph.geometry.colorsNeedUpdate = true;
      }
    });
  }
}

exports.LOD = LOD;
