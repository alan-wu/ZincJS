var THREE = require('three');
const markerImage = new Image(128, 128);
markerImage.src = require("../assets/mapMarker.svg");
const texture = new THREE.Texture();
texture.image = markerImage;
texture.needsUpdate = true;
const size = [0.02, 0.03, 1];
const spriteMaterial = new THREE.SpriteMaterial({
  map: texture,
  alphaTest: 0.5,
  transparent: true,
  depthTest: false,
  depthWrite: false,
  sizeAttenuation: false
});
const createNewSpriteText = require('../utilities').createNewSpriteText;

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
  let userTexture = undefined;
  let userMaterial = undefined;
  let userSprite = undefined;
  let userUrl = undefined;
  let defaultDisplay = true;
  this.morph = new THREE.Group();
  this.group = this.morph;
  this.parent = zincObject;
  this.isMarker = true;
  let enabled = false;
  this.ndc = new THREE.Vector3();
  let number = undefined;
  let label = undefined;

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

  this.setUserSprite = () => {
    if (defaultDisplay && userSprite) {
      this.morph.add(userSprite);
      this.morph.remove(sprite);
      if (label) {
        this.morph.remove(label);
      }
      defaultDisplay = false;
    }
  }

  this.setImageForUserSprite = (image, size) => {
    if (userSprite) {
      this.morph.remove(userSprite);
      userSprite = undefined;
    }
    if (userTexture) userTexture.dispose();
    if (userMaterial) userMaterial.dispose();
    userTexture = new THREE.Texture();
    userTexture.image = image;
    userTexture.needsUpdate = true;
    userMaterial = new THREE.SpriteMaterial({
      map: userTexture,
      alphaTest: 0.5,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      sizeAttenuation: false
    });
    if (!size) {
      size =  [0.05, 0.05, 1];
    }
    userSprite = new THREE.Sprite(userMaterial);
    userSprite.center.set(0.5, 0);
    userSprite.scale.set(size[0], size[1], size[2]);
    userSprite.userData = this;
    this.setUserSprite();
  }

  this.setDefaultSprite = () => {
    if (!defaultDisplay) {
      defaultDisplay = true;
      this.morph.add(sprite);
      if (userSprite) this.morph.remove(userSprite);
      if (label) this.morph.add(label);
    }
  }

  this.loadUserSprite = (url, size) => {
    if (url) {
      if (url !== userUrl) {
        userUrl = url;
        const userImage = new Image(128, 128);
        userImage.crossOrigin = "anonymous"
        userImage.onload = () => {
          this.setImageForUserSprite(userImage, size);
        };
        userImage.src = url;
      } else {
        this.setUserSprite();
      }
    }
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
    if (label) {
      label.material.map.dispose();
      label.material.dispose();
      label = undefined;
    }
  }

  this.isEnabled = () => {
    return enabled;
  }

  this.setNumber = (numberIn) => {
    if (!numberIn || (number != numberIn)) {
      //remove label
      if (label) {
        this.morph.remove(label);
        label.material.map.dispose();
        label.material.dispose();
        label = undefined;
      }
    }
    if (!label && numberIn) {
      label = createNewSpriteText(numberIn, 0.012, "black", "Asap", 50, 500);
      this.morph.add(label);
    }
    number = numberIn;
  }

  this.getNumber = () => {
    return number ? number : 1;
  }

  /**
   * Set the visibility of this Geometry.
   * 
   * @param {Boolean} visible - a boolean flag indicate the visibility to be set 
   */
  this.setVisibility = function(visible) {
    if (visible !== this.visible) {
      this.visible = visible;
      this.group.visible = visible;
      if (this.parent.region) this.parent.region.pickableUpdateRequired = true;
    }
  }

  /**
   * Enable and visualise the marker.
   */  
  this.enable = () => {
    enabled = true;
    this.morph.visible = true;
    this.visible = true;
  }

  /**
   * Disable and hide the marker.
   */ 
  this.disable = () => {
    enabled = false;
    this.morph.visible = false;
    this.visible = false;
  }

	initialise();

}

Marker.prototype = Object.create((require('./zincObject').ZincObject).prototype);
exports.Marker = Marker;
