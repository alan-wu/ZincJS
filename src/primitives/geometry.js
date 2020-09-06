const THREE = require('three');

/**
 * Provides an object which stores geometry and provides method which controls its animations.
 * This is created when a valid json file containging geometry is read into a {@link Zinc.Scene}
 * object.
 * 
 * @class
 * @author Alan Wu
 * @return {Zinc.Geometry}
 */
const Geometry = function () {
  (require('./zincObject').ZincObject).call(this);
	// THREE.Geometry or THREE.BufferGeometry
	this.videoHandler = undefined;
  this.isGeometry = true;

	this.createMesh = (geometryIn, materialIn, options) => {
		if (this.geometry && this.morph && (geometryIn != undefined))
			return;
		// First copy the geometry
		let geometry = this.toBufferGeometry(geometryIn, options);

		let isTransparent = false;
		if (1.0 > options.opacity)
			  isTransparent = true;

		let material = undefined;
		if (geometry._video === undefined) {
			if (materialIn) {
				material = materialIn;
				material.morphTargets = options.localTimeEnabled;
				material.morphNormals = options.localTimeEnabled;
			} else {
				if (geometry instanceof THREE.BufferGeometry && geometry.attributes.color === undefined) {
					material = new THREE.MeshPhongMaterial({
						color : options.colour,
						morphTargets : options.localTimeEnabled,
						morphNormals : options.localTimeEnabled,
						transparent : isTransparent,
						opacity : options.opacity,
						side : THREE.DoubleSide
					});
				} else {
					material = new THREE.MeshPhongMaterial({
						color : options.colour,
						morphTargets : options.localTimeEnabled,
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
		let mesh = new THREE.Mesh(geometry, material); 
		this.setMesh(mesh, options.localTimeEnabled, options.localMorphColour);
	}
	
	this.calculateUVs = () => {
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
	 * Set wireframe display for this geometry.
	 * 
	 * @param {Boolean} wireframe - Flag to turn on/off wireframe display.
	 */
	this.setWireframe = wireframe => {
		this.morph.material.wireframe = wireframe;
	}
	
}

Geometry.prototype = Object.create((require('./zincObject').ZincObject).prototype);
exports.Geometry = Geometry;
