import * as THREE from 'three/webgpu';
import {
  keepIndexType,
  extractVertices,
  getTubeLinesGeometry,
  toBufferGeometry,
  updateMorphColorAttribute,
} from '../utilities';
import { LineSegments } from '../three/line/LineSegments';

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
  //Levels loaded after dispose are discarded
  this._disposed = false;
  this._dirty = true;
  this._bandMin = 0;
  this._bandMax = -1;

  /*
   * Add a level of LOD at the specified distance
   */
  this.addLevel = (object, distanceIn) => {
    if (object) {
      keepIndexType(object.geometry);
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
        url: '',
      };
      this.levels.splice(l, 0, levelObject);
      object.renderOrder = this._renderOrder;
      //this.add( object );
    }
  };

  /*
   * This is called once an ondemand level is loaded
   */
  this.levelLoaded = (object, distanceIn) => {
    if (object) {
      keepIndexType(object.geometry);
      const distance = Math.abs(distanceIn);
      for (let l = 0; l < this.levels.length; l++) {
        if (distance === this.levels[l].distance) {
          this._parent.group.add(object);
          this.levels[l].morph = object;
          this.levels[l].loaded = true;
          this.levels[l].loading = false;
          break;
        }
      }
      this.checkTransparentMesh();
      this._parent?.requestRender?.();
    }
  };

  this.addLevelFromURL = (loader, level, url, index, preload) => {
    this._loader = loader;
    const distance = this.calculateDistance(level);
    const levelObject = {
      distance: distance,
      morph: undefined,
      loaded: false,
      loading: false,
      url: url,
      index: index,
    };
    let l;
    for (l = 0; l < this.levels.length; l++) {
      if (distance < this.levels[l].distance) {
        break;
      }
    }
    this.levels.splice(l, 0, levelObject);
    if (preload) {
      this.loadLevel(l);
    }
  };

  //load the mesh at index, return true if morph is not ready
  this.loadLevel = (index) => {
    const level = this.levels[index];
    if (!level.morph && !level.loaded && !level.loading) {
      level.loading = true;
      this._loader.load(level.url, this.lodLoader(level.distance), undefined, undefined, {
        index: level.index,
      });
    }
    return level.morph === undefined;
  };

  this.calculateDistance = function (level) {
    this._parent.getBoundingBox();
    const radius = this._parent.radius;
    let distance = 0;
    if (level === 'far') {
      distance = radius * 4.5;
    } else if (level === 'medium') {
      distance = radius * 2.5;
    } else if (level === 'close') {
      distance = 0;
    }
    return distance;
  };

  /**
   * Check if there are multiple levels.
   */
  this.containsLevels = () => {
    if (this.levels && this.levels.length > 1) {
      return true;
    }
    return false;
  };

  /**
   * Check if material is transparent, create secondary mesh
   * for better rendering if required.
   */
  this.checkTransparentMesh = () => {
    const level = this.levels[this._currentLevel];
    if (this._material) {
      if (this._material.transparent) {
        if (!this._secondaryMaterial) {
          this._secondaryMaterial = this._material.clone();
          this._secondaryMaterial.side = THREE.FrontSide;
        }
        this._secondaryMaterial.opacity = this._material.opacity;
        if (this._secondaryMaterial.emissive) {
          this._secondaryMaterial.emissive.copy(this._material.emissive);
        }
        this._secondaryMaterial.needsUpdate = true;
        // THREE.Mesh - for utilities purpose such as rendering
        // transparent surfaces - one for front face and one for back face.
        if (!level.secondaryMesh) {
          level.secondaryMesh = new THREE.Mesh(level.morph.geometry, this._secondaryMaterial);
          level.secondaryMesh.renderOrder = level.morph.renderOrder + 1;
          level.secondaryMesh.userData = level.morph.userData;
          level.secondaryMesh.name = level.morph.name;
        }
        this._material.side = THREE.BackSide;
        this._material.needsUpdate = true;
        if (!level.secondaryMesh.parent) {
          level.morph.add(level.secondaryMesh);
          if (this._parent.animationGroup) {
            this._parent.animationGroup.add(level.secondaryMesh);
          }
        }
      } else {
        if (level.secondaryMesh) {
          //Do not delete this mesh, remove it from
          //rendering and animation group instead
          level.morph.remove(level.secondaryMesh);
          if (this._parent.animationGroup) {
            this._parent.animationGroup.uncache(level.secondaryMesh);
            this._parent.animationGroup.remove(level.secondaryMesh);
          }
        }
        this._material.side = THREE.DoubleSide;
        this._material.needsUpdate = true;
      }
    }
  };

  this.dispose = () => {
    this._disposed = true;
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
  };

  this.getCurrentLevel = () => {
    return this._currentLevel;
  };

  this.getCurrentMorph = () => {
    const level = this.levels[this._currentLevel];
    if (level && level.morph) {
      return level.morph;
    }
    return this._parent.morph;
  };

  /**
   * Loader for lod object
   */
  this.lodLoader = function (distance) {
    return (geometryIn) => {
      if (this._disposed) {
        geometryIn.dispose();
        return;
      }
      const material = this._material;
      const options = {
        localTimeEnabled: this._parent.timeEnabled,
        localMorphColour: this._parent.morphColour,
        isLines: this._parent.isLines || this._parent.isTubeLines,
      };
      const geometry = toBufferGeometry(geometryIn, options);
      let mesh = undefined;
      if (this._parent.isGeometry) {
        mesh = new THREE.Mesh(geometry, material);
      } else if (this._parent.isLines) {
        mesh = new LineSegments(geometry, material);
      } else if (this._parent.isTubeLines) {
        const { radius, radialSegments, smooth } = this._parent.getGeometryConfig();
        const tubeGeometry = getTubeLinesGeometry(
          extractVertices(geometry),
          radius,
          radialSegments,
          smooth,
        );
        mesh = new THREE.Mesh(tubeGeometry, material);
      }
      mesh.userData = this._parent;
      mesh.renderOrder = this._renderOrder;
      geometryIn.dispose();
      this.levelLoaded(mesh, distance);
    };
  };

  this.updateMorphColorAttribute = (currentOnly) => {
    //Multilayers - set all
    if (this._material) {
      //Gate on our own morphColorMix uniform rather than
      //material.vertexColors - that flag is deliberately left false for
      //morph colour materials now (see applyMorphColorNode's callers), so
      //NodeMaterial doesn't multiply the blend by the static 'color'
      //attribute on top of it.
      if (
        this._material.userData &&
        this._material.userData.uniforms &&
        this._material.userData.uniforms.morphColorMix
      ) {
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
  };

  this.setColour = (colour) => {
    this._material.color = colour;
    if (this._secondaryMaterial) {
      this._secondaryMaterial.color = colour;
    }
    updateGeometryColour();
  };

  this.setFrustumCulled = (flag) => {
    this.levels.forEach((level) => {
      if (level.morph) {
        level.morph.frustumCulled = flag;
      }
      if (level.secondaryMesh) {
        level.secondaryMesh.frustumCulled = flag;
      }
    });
  };

  this.setMaterial = (material) => {
    if (material) {
      if (!this._material || this._material.id !== material.id) {
        this._material = material;
        if (this._secondaryMaterial) {
          this._secondaryMaterial.dispose();
          this._secondaryMaterial = undefined;
        }
        if (material.transparent || this.levels.some((level) => level.secondaryMesh)) {
          this._secondaryMaterial = material.clone();
          this._secondaryMaterial.side = THREE.FrontSide;
          this._secondaryMaterial.transparent = true;
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
  };

  this.setName = (name) => {
    this.levels.forEach((level) => {
      if (level.morph) {
        level.morph.name = name;
      }
      if (level.secondaryMesh) {
        level.secondaryMesh.name = name;
      }
    });
  };

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
  };

  this.setVertexColors = (vertexColors) => {
    this._material.vertexColors = vertexColors;
    updateGeometryColour();
    if (this._secondaryMaterial) {
      this._secondaryMaterial.vertexColors = vertexColors;
    }
  };

  /* Update layers based on the */
  this.update = (camera, center) => {
    const levels = this.levels;
    const l = levels.length;
    if (l < 2) return;
    const distance = camera.cameraObject.position.distanceTo(center);

    // Still in the same band and nothing new has loaded
    if (!this._dirty && distance >= this._bandMin && distance < this._bandMax) return;
    this._dirty = false;

    // Furthest level whose threshold has been passed (levels are sorted by distance)
    let target = -1;
    while (target + 1 < l && distance >= levels[target + 1].distance) target++;
    this._bandMin = target >= 0 ? levels[target].distance : -Infinity;
    this._bandMax = target + 1 < l ? levels[target + 1].distance : Infinity;

    if (target > -1 && !levels[target].morph) this.loadLevel(target);

    // Show the nearest loaded level at or below target, else the nearest loaded one above
    let visible = -1;
    for (let i = target; i >= 0 && visible < 0; i--) if (levels[i].morph) visible = i;
    for (let i = target + 1; i < l && visible < 0; i++) if (levels[i].morph) visible = i;

    for (let i = 0; i < l; i++) {
      if (levels[i].morph) levels[i].morph.visible = i === visible;
    }

    if (this._currentLevel !== visible) {
      this._currentLevel = visible;
      this.checkTransparentMesh();
      this._parent?.requestRender?.();
    }
  };

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
  };

  const updateGeometryColour = () => {
    this.levels.forEach((level) => {
      if (level.morph && level.morph.geometry) {
        level.morph.geometry.colorsNeedUpdate = true;
      }
    });
  };
};

export { LOD };
