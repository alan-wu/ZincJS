var THREE = require('three');


exports.Label = function ( textIn ) {
  var text = textIn;
  this.element = undefined;
  var sprite = undefined;
  var _this = this;
  
  var createBitmap = function() {
    //create an element to render the font on
    var bitmap = document.createElement('canvas');
    bitmap.width = 128;
    bitmap.height = 32;
    var g = bitmap.getContext('2d');
    g.textBaseline = "alphabetic"; 
    var metrics = g.measureText( text ); 
    var textWidth = metrics.width; 
    //draw the font on the element
    g.fillStyle = 'rgb(255,255,255)';
    g.textAlign = "centre"; 
    g.font = '20px Helvetica';
    g.fillText(text, 64,16);
    g.strokeStyle = 'rgba(255,255,255)';
    g.strokeText(text,64,16);
    return bitmap;
  }
  
  var createFontSprite = function() {
    //create a texture with the element and put it on threejs object
    var texture = new THREE.Texture(_this.element);
    texture.needsUpdate = true;
    var spriteMaterial = new THREE.SpriteMaterial( {  map: texture, color: '#ffffff'} ); 
    sprite = new THREE.Sprite( spriteMaterial );
  }
  
  var createLabel = function() {
    _this.element  = createBitmap();
    createFontSprite();
  }
  
//now set the position at the correct 3D space 
  this.setPosition = function(x, y, z) {
    if (sprite)
      sprite.position.set(x, y, z);
  }
  
  //scale up the texture
  this.setScale = function(scaling) {
    if (sprite && scaling > 0.0) 
      sprite.scale.set( scaling, scaling, 1.0 );
  }
  
  this.dispose = function() {
    _this.object = undefined;
    _this.element.parentNode.removeChild( _this.element );
  }
  
  this.getSprite = function() {
    console.log(sprite)
    return sprite;
  }
  
  createLabel();
};



