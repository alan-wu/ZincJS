var THREE = require('three');
const markerImage = new Image(128, 128);
markerImage.src = require("../assets/mapMarker.svg");
const texture = new THREE.Texture();
texture.image = markerImage;
texture.needsUpdate = true;

//Marker - used to indicate there is a 
const Marker = function(zincObject) {
  (require('./zincObject').ZincObject).call(this);
  this.texture = texture;
  let spriteMaterial = undefined;
  let sprite = undefined;
  this.morph = new THREE.Group();
  this.parent = zincObject;
  this.isMarker = true;
  let enabled = false;

	let initialise = () => {
    spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      alphaTest: 0.5,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      sizeAttenuation: false
    });
    sprite = new THREE.Sprite(spriteMaterial);
    sprite.center.set(0.5, 0);
    this.morph.add(sprite);
    this.morph.position.set(0, 0, 0);
    sprite.scale.set(0.015, 0.02, 1);
    sprite.userData = this;
  }

  this.updateDistanceBasedOpacity = camera => {
    if (camera.target) {
      const spriteDistance = camera.position.distanceTo(
        this.morph.position);
      const targetDistance = camera.position.distanceTo(
        camera.target);
      if (spriteDistance > targetDistance) {
        sprite.material.opacity = 1.0;
      } else {
        sprite.material.opacity = 1.0;
      }
    }
  }

  this.setPosition = (x, y, z) => {
    this.morph.position.set(x, y, z);
  }

  this.setSpriteSize = size => {
    sprite.scale.set(0.015, 0.02, 1);
    sprite.scale.multiplyScalar(size);
  }

  this.isEnabled = () => {
    return enabled;
  }

  this.enable = () => {
    enabled = true;
    this.morph.visible = true;
  }
  
  this.disable = () => {
    enabled = false;
    this.morph.visible = false;
  }

	//this should be handle by scene... check the sync at 
	initialise();

}

Marker.prototype = Object.create((require('./zincObject').ZincObject).prototype);
exports.Marker = Marker;
