import * as THREE from 'three/webgpu';
import { toBufferGeometry } from '../utilities';
import { applyMorphColorNode } from '../tsl/morphColorMaterial';
import { ZincObject} from './zincObject';

const createMeshForGeometry =  (geometryIn, materialIn, options) => {
  // First copy the geometry
  let geometry = toBufferGeometry(geometryIn, options);

  let isTransparent = false;
  if (1.0 > options.opacity) {
    isTransparent = true;
  }
  let material = undefined;
  if (geometry._video === undefined) {
    if (materialIn) {
      material = materialIn;
    } else {
      material = new THREE.MeshPhongMaterial({
        color : options.colour,
        vertexColors : false,
        transparent : isTransparent,
        opacity : options.opacity,
        side : THREE.DoubleSide
      });
    }
    if (options.localMorphColour && geometry.morphAttributes[ "color" ]) {
      //Force vertexColors off (even if materialIn already had it true) -
      //NodeMaterial would otherwise multiply our morph colour blend by
      //the static, non-morph 'color' attribute (vertexColor() in
      //setupDiffuseColor), which zeroes out whatever channel that static
      //colour never needed (e.g. blue on an originally pure-red vertex),
      //turning parts of the blend black instead of the intended hue.
      //applyMorphColorNode's colorNode fully replaces vertex colouring.
      material.vertexColors = false;
      material = applyMorphColorNode(material);
    }
  } else {
    let videoTexture = geometry._video.createCanvasVideoTexture();
    material = new THREE.MeshBasicMaterial({
      color : new THREE.Color(1, 1, 1),
      transparent : isTransparent,
      opacity : options.opacity,
      map : videoTexture,
      side : THREE.DoubleSide
    });
  }
  return new THREE.Mesh(geometry, material);
}

/**
 * Provides an object which stores geometry and provides method which controls its animations.
 * This is created when a valid json file containging geometry is read into a {@link Zinc.Scene}
 * object.
 *
 * @class
 * @author Alan Wu
 * @return {Geometry}
 */
const Geometry = function () {
  ZincObject.call(this);
	// THREE.Geometry or THREE.BufferGeometry
	this.videoHandler = undefined;
  this.isGeometry = true;

  /**
   * Create the mesh for rendering
   *
   * @param {THREE.Geomtry} geometryIn - Geometry to be rendered.
   * @param {THREE.Material} materialIn - Material to be set for the geometry.
   * @param {Object} options - Provide various options
   * @param {THREE.Color}  options.colour - colour to be set for the geometry
   * @param {Boolean} options.localTimeEnabled - A flag to indicate either the geometry is
   * time dependent.
   * @param {Boolean} options.localMorphColour - A flag to indicate either the colour is
   * time dependent.
   * @param {Number} options.opacity - Opacity to be set for the geometry
   */
	this.createMesh = (geometryIn, materialIn, options) => {
    //Skip if there is a morph already
		if (this.morph && this.morph.geometry && (geometryIn != undefined))
			return;
		const mesh = createMeshForGeometry(geometryIn, materialIn, options);
    this.videoHandler = mesh.geometry._video;
		this.setMesh(mesh, options.localTimeEnabled, options.localMorphColour);
	}

  /**
   * Handle transparent mesh, create a clone for backside rendering if it is
   * transparent.
   */
  this.checkTransparentMesh = function() {
    this._lod.checkTransparentMesh();
  }

	/**
	 * Set wireframe display for this geometry.
	 *
	 * @param {Boolean} wireframe - Flag to turn on/off wireframe display.
	 */
	this.setWireframe = wireframe => {
		this.morph.material.wireframe = wireframe;
	}

  /**
   * Edit Vertice in index.
   */
  this.editVertices = function(coords, i) {
    if (coords && coords.length) {
      let mesh = this.getMorph();
      const attribute = mesh.geometry.getAttribute("position");
      if (!mesh || 0 > i) {
        return;
      } else {
        let index = i * 3;
        coords.forEach(coord => {
          attribute.array[index++] = coord[0];
          attribute.array[index++] = coord[1];
          attribute.array[index++] = coord[2];
        });
        attribute.needsUpdate = true;
        mesh.geometry.computeBoundingBox();
        mesh.geometry.computeBoundingSphere();
        this.boundingBoxUpdateRequired = true;
      }
    }
  }

  /**
   * Check if the geometry is time varying.
   *
   * @return {Boolean}
   */
  this.isTimeVarying = function() {
    if (this.timeEnabled || this.morphColour || this.videoHandler)
      return true;
    return false;
  }


}

Geometry.prototype = Object.create(ZincObject.prototype);
export { Geometry };
