var THREE = require('three');
const markerImage = new Image(64, 64);
markerImage.src = require("./assets/mapMarker.svg");
const texture = new THREE.Texture();
texture.image = markerImage;
texture.needsUpdate = true;

//Marker - used to indicate there is a 
exports.Marker = function(zincObject) {
  this.texture = texture;
  let spriteMaterial = undefined;
  let sprite = undefined;
  this.graphicsObject = new THREE.Group();
  console.log(zincObject);
  this.parent = zincObject;
  this.isMarker = true;
  let enabled = true;

	let initialise = () => {
    spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      alphaTest: 0.5,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      sizeAttenuation: false
    });
    sprite = new (require("./three/Sprite").Sprite)(spriteMaterial);
    this.graphicsObject.add(sprite);
    this.graphicsObject.position.set(0, 0, 0);
    sprite.scale.set(0.015, 0.02, 1);
    sprite.userData = this;
  }

  this.updateDistanceBasedOpacity = camera => {
    if (camera.target) {
      const spriteDistance = camera.position.distanceTo(
        this.graphicsObject.position);
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
    this.graphicsObject.position.set(x, y, z);
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
    this.graphicsObject.visible = true;
  }
  
  this.disable = () => {
    enabled = false;
    this.graphicsObject.visible = false;
  }

	//this should be handle by scene... check the sync at 
	initialise();

}
