const THREE = require('three');


exports.Label = function ( textIn ) {
  const text = textIn;
  this.element = undefined;
  let sprite = undefined;
  const _this = this;
  
  const createBitmap = () => {
    //create an element to render the font on
    const bitmap = document.createElement('canvas');
    bitmap.width = 128;
    bitmap.height = 32;
    const g = bitmap.getContext('2d');
    g.textBaseline = "alphabetic"; 
    const metrics = g.measureText( text ); 
    const textWidth = metrics.width; 
    //draw the font on the element
    g.fillStyle = 'rgb(255,255,255)';
    g.textAlign = "centre"; 
    g.font = '20px Helvetica';
    g.fillText(text, 64,16);
    g.strokeStyle = 'rgba(255,255,255)';
    g.strokeText(text,64,16);
    return bitmap;
  };
  
  const createFontSprite = () => {
    //create a texture with the element and put it on threejs object
    const texture = new THREE.Texture(_this.element);
    texture.needsUpdate = true;
    const spriteMaterial = new THREE.SpriteMaterial( {  map: texture, color: '#ffffff'} ); 
    sprite = new THREE.Sprite( spriteMaterial );
  };
  
  const createLabel = () => {
    _this.element  = createBitmap();
    createFontSprite();
  }; 
  
  this.getPosition = () => {
	  if (sprite)
		  return [sprite.position.x, sprite.position.y, sprite.position.z];
	  return [0, 0, 0];
  }
  
//now set the position at the correct 3D space 
  this.setPosition = (x, y, z) => {
    if (sprite)
      sprite.position.set(x, y, z);
  }
  
  //scale up the texture
  this.setScale = scaling => {
    if (sprite && scaling > 0.0) 
      sprite.scale.set( scaling, scaling, 1.0 );
  }
  
  this.dispose = () => {
    _this.object = undefined;
    _this.element.parentNode.removeChild( _this.element );
  }
  
  this.getSprite = () => {
    return sprite;
  }
  
  this.getString = () => {
	  return Text;
  }
  
  createLabel();
};



