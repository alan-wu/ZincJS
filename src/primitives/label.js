const SpriteText = require('three-spritetext').default;

exports.Label = function ( textIn, colour ) {
  let text = textIn;
  let sprite = undefined;
  if (colour)
    sprite = new SpriteText(text, 0.015, colour.getStyle());
  else
    sprite = new SpriteText(text, 0.015);
  sprite.material.sizeAttenuation = false;
  sprite.center.x = -0.05;
  sprite.center.y = 0;

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

  this.setColour = colour => {
    sprite.color = colour.getStyle();
  }
  
  //scale up the texture
  this.setScale = scaling => {
    if (sprite && scaling > 0.0) 
      sprite.scale.set( scaling, scaling, 1.0 );
  }
  
  this.dispose = () => {
    sprite.dispose();
  }
  
  this.getSprite = () => {
    return sprite;
  }
  
  this.getString = () => {
	  return text;
  }

};



