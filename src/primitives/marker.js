var THREE = require('three');
const markerImage = new Image(128, 128);
markerImage.src = require("../assets/mapMarker.svg");
const texture = new THREE.Texture();
texture.image = markerImage;
texture.needsUpdate = true;
const size = [0.017, 0.025, 1];
const spriteMaterial = new THREE.SpriteMaterial({
  map: texture,
  alphaTest: 0.5,
  transparent: true,
  depthTest: false,
  depthWrite: false,
  sizeAttenuation: false
}); 

/**
 * A special graphics type with a tear drop shape.
 * It is currently used to mark the location of a
 * {@link zincObject}.
 * 
 * @class
 * @author Alan Wu
 * @return {Marker}
 */
const Marker = function(zincObject) {
  (require('./zincObject').ZincObject).call(this);
  this.texture = texture;
  let sprite = undefined;
  this.morph = new THREE.Group();
  this.group = this.morph;
  this.parent = zincObject;
  this.isMarker = true;
  let enabled = false;
  this.ndc = new THREE.Vector3();

	let initialise = () => {             
    sprite = new THREE.Sprite(spriteMaterial);
    sprite.center.set(0.5, 0);
    this.morph.add(sprite);
    this.morph.position.set(0, 0, 0);
    this.morph.renderOrder = 10000;
    sprite.scale.set(size[0], size[1], size[2]);
    sprite.userData = this;
  }

  this.updateVisual = (min, max) => {
    let scale = 1;
    let porportion = 0;
    if (min !== max) {
      porportion = (1 - (this.ndc.z - min) / (max - min));
      scale = 0.6 +  porportion * 0.4;
    }
    this.setSpriteSize(scale);
  }

  this.updateNDC = camera => {
    this.ndc.copy(this.morph.position);
    this.ndc.project(camera);
    this.ndc.z = Math.min(Math.max(this.ndc.z, 0), 1);
    return this.ndc;
  }

  /**
   * Set the position of the marker.
   * 
   * @param {Number} x - x coordinate to be set.
   * @param {Number} y - y coordinate to be set.
   * @param {Number} z - z coordinate to be set.
   */
  this.setPosition = (x, y, z) => {
    this.morph.position.set(x, y, z);
  }

  /**
   * Set the size of the marker.
   * 
   * @param {Number} size - size to be set.
   */ 
  this.setSpriteSize = size => {
    sprite.scale.set(0.015, 0.02, 1);
    sprite.scale.multiplyScalar(size);
  }

  /**
   * Clean up this object,
   */ 
  this.dispose = () => {
    if (this.morph) {
      this.morph.clear();
    }
    if (sprite) {
      sprite.clear();
      sprite = undefined;
    }
  }

  this.isEnabled = () => {
    return enabled;
  }

  /**
   * Enable and visualise the marker.
   */  
  this.enable = () => {
    enabled = true;
    this.morph.visible = true;
  }

  /**
   * Disable and hide the marker.
   */ 
  this.disable = () => {
    enabled = false;
    this.morph.visible = false;
  }

	initialise();

}

Marker.prototype = Object.create((require('./zincObject').ZincObject).prototype);
exports.Marker = Marker;
