const THREE = require('three');
const toBufferGeometry = require('../utilities').toBufferGeometry;

const createMeshForGeometry =  (geometryIn, materialIn, options) => {
  // First copy the geometry
  let geometry = toBufferGeometry(geometryIn, options);

  let isTransparent = false;
  if (1.0 > options.opacity)
      isTransparent = true;

  let material = undefined;
  if (geometry._video === undefined) {
    const morphTargets = options.localTimeEnabled || options.localMorphColour;
    if (materialIn) {
      material = materialIn;
      material.morphTargets = morphTargets;
      material.morphNormals = options.localTimeEnabled;
    } else {
      if (geometry instanceof THREE.BufferGeometry && geometry.attributes.color === undefined) {
        material = new THREE.MeshPhongMaterial({
          color : options.colour,
          morphTargets : morphTargets,
          morphNormals : options.localTimeEnabled,
          transparent : isTransparent,
          opacity : options.opacity,
          side : THREE.DoubleSide
        });
      } else {
        material = new THREE.MeshPhongMaterial({
          color : options.colour,
          morphTargets : morphTargets,
          morphNormals : options.localTimeEnabled,
          vertexColors : THREE.VertexColors,
          transparent : isTransparent,
          opacity : options.opacity,
          side : THREE.DoubleSide
        });
      }
    }
    //material = PhongToToon(material);
    if (options.localMorphColour && geometry.morphAttributes[ "color" ]) {
      material.onBeforeCompile = (require("./augmentShader").augmentMorphColor)();
    }
  } else {
    let videoTexture = geometry._video.createCanvasVideoTexture();
    material = new THREE.MeshBasicMaterial({
      morphTargets : options.localTimeEnabled,
      color : new THREE.Color(1, 1, 1),
      transparent : isTransparent,
      opacity : options.opacity,
      map : videoTexture,
      side : THREE.DoubleSide
    });
    this.videoHandler = geometry._video;
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
  (require('./zincObject').ZincObject).call(this);
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
		this.setMesh(mesh, options.localTimeEnabled, options.localMorphColour);
	}

  /**
   * Calculate the UV for texture rendering.
   */
	this.calculateUVs = () => {
    //Multilayers
		this.geometry.computeBoundingBox();
		const max = this.geometry.boundingBox.max, min = this.geometry.boundingBox.min;
		const offset = new THREE.Vector2(0 - min.x, 0 - min.y);
		const range = new THREE.Vector2(max.x - min.x, max.y - min.y);
		this.geometry.faceVertexUvs[0] = [];
		for (let i = 0; i < this.geometry.faces.length ; i++) {
		    const v1 = this.geometry.vertices[this.geometry.faces[i].a];
		    const v2 = this.geometry.vertices[this.geometry.faces[i].b];
		    const v3 = this.geometry.vertices[this.geometry.faces[i].c];
		    geometry.faceVertexUvs[0].push(
		        [
		            new THREE.Vector2((v1.x + offset.x)/range.x ,(v1.y + offset.y)/range.y),
		            new THREE.Vector2((v2.x + offset.x)/range.x ,(v2.y + offset.y)/range.y),
		            new THREE.Vector2((v3.x + offset.x)/range.x ,(v3.y + offset.y)/range.y)
		        ]);
		}
		geometry.uvsNeedUpdate = true;	
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
	

}

Geometry.prototype = Object.create((require('./zincObject').ZincObject).prototype);
exports.Geometry = Geometry;
