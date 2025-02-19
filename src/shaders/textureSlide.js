const THREE = require('three');

const glslVersion = THREE.GLSL3;

const fs =
`
precision highp float;
precision highp int;
precision highp sampler2DArray;

uniform sampler2DArray diffuse;
in vec3 vUw;

out vec4 outColor;

void main() {

  vec4 color = texture( diffuse, vUw );

  // lighten a bit
  outColor = vec4( color.rgb + .2, 1.0 );

}
`;

const vs = 
`
out vec3 vUw;
uniform float depth;
uniform vec3 slide;
uniform int direction;
uniform bool flipY;

void main() {

  vec3 slidePos = position.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position.xyz, 1.0 );

  if (direction == 1)
    slidePos = vec3(slide.x, position.y, position.x);
  if (direction == 2)
    slidePos = vec3(position.x, slide.y, position.y);
  if (direction == 3)
    slidePos = vec3(position.x, position.y, slide.z);

  if (flipY) 
    slidePos.y = 1.0 - slidePos.y;

  vUw.xyz = vec3(slidePos.x, slidePos.y, slidePos.z * depth);

}
`;

const getUniforms = function() {
  return {
    diffuse: { value: undefined },
    depth: { value: 1 },
    slide: { value: new THREE.Vector3( 0, 0, 1 ) },
    direction: {value: 1},
    flipY: { value: true},
  };
}

exports.fs = fs;
exports.vs = vs;
exports.glslVersion = glslVersion;
exports.getUniforms = getUniforms;
