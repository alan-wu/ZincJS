var THREE = require('three');
const markerImage = new Image(64, 64);
markerImage.src = require("./assets/mapMarker.svg");
const texture = new THREE.Texture();
texture.image = markerImage;
texture.needsUpdate = true;

//Marker - used to indicate there is a 
exports.Marker = function() {
  this.texture = texture;
  let spriteMaterial = undefined;
  this.sprite = undefined;
  let isEnable = true;

	let initialise = () => {
    spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      alphaTest: 0.5,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      sizeAttenuation: false
    });
    this.sprite = new THREE.Sprite(spriteMaterial);
    this.sprite.position.set(0, 0, 0);
    this.sprite.scale.set(0.01, 0.01, 1);
  }

  this.setPosition = (x, y, z) => {
    console.log(x, y, z);
    this.sprite.position.set(x, y, z);
  }

  this.enable = () => {
    isEnable = true;
    this.sprite.visible = true;
  }
  
  this.disable = () => {
    isEnable = false;
    this.sprite.visible = false;
  }

	//this should be handle by scene... check the sync at 
	initialise();

}
