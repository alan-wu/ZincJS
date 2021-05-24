const THREE = require('three');

let roundRect = function(ctx, x, y, w, h, r) { 
  ctx.beginPath(); 
  ctx.moveTo(x + r, y); 
  ctx.lineTo(x + w - r, y); 
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); 
  ctx.lineTo(x + w, y + h - r); 
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); 
  ctx.lineTo(x + r, y + h); 
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); 
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); 
  ctx.closePath(); 
  ctx.fill(); 
  ctx.stroke();
} 


exports.Label = function ( textIn ) {
  const text = textIn;
  this.element = undefined;
  let sprite = undefined;
  let borderThickness = 0;
  var fontface = "Arial";
  var fontsize = 18;
  let borderColor = { r:0, g:0, b:0, a:0.0 };
  let backgroundColor = { r:0, g:0, b:0, a:0.0 };
  let textColor ={ r:0, g:0, b:0, a:1.0 };

  const createBitmap = () => {
    //create an element to render the font on
    const bitmap = document.createElement('canvas');
    const g = bitmap.getContext('2d');
    g.textBaseline = "alphabetic";
    g.font = fontsize + "px " + fontface;
    const metrics = g.measureText( text );
    console.log(metrics)
    const textWidth = metrics.width; 
    g.textAlign = "left"; 
    g.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," + backgroundColor.a + ")";
    g.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor.a + ")";

    g.lineWidth = borderThickness;
    roundRect(g, borderThickness/2, borderThickness/2, (textWidth + borderThickness) * 1.1, fontsize * 1.4 + borderThickness, 8);
    
    g.fillStyle = "rgba("+textColor.r+", "+textColor.g+", "+textColor.b+", 1.0)";
    g.fillText( text, borderThickness, fontsize + borderThickness);
    
    //draw the font on the element
    //g.fillStyle = 'rgb(255,255,255)';
    //g.textAlign = "centre"; 
    //g.fillText(text, borderThickness, fontsize + borderThickness);
    //g.strokeStyle = 'rgba(255,255,255)';
    //g.strokeText(text, borderThickness, fontsize + borderThickness);
    return bitmap;
  };
  
  const createFontSprite = () => {
    //create a texture with the element and put it on threejs object
    const texture = new THREE.Texture(this.element);
    texture.needsUpdate = true;
    const spriteMaterial = new THREE.SpriteMaterial( {  map: texture, color: '#ffffff', 
      useScreenCoordinates: false, sizeAttenuation: false} ); 
    sprite = new THREE.Sprite( spriteMaterial );
    console.log(sprite)
    sprite.scale.set(0.15, 0.15, 0.15);
  };
  
  const createLabel = () => {
    this.element  = createBitmap();
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
    this.object = undefined;
    this.element.parentNode.removeChild( this.element );
  }
  
  this.getSprite = () => {
    return sprite;
  }
  
  this.getString = () => {
	  return Text;
  }
  
  createLabel();
};



