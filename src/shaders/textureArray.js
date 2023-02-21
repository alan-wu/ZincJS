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
  outColor = vec4( color.rgb + .2, 0.2 );

}
`;

const vs = 
`
out vec3 vUw;
uniform float depth;

void main() {

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

  vUw.xyz = vec3(position.x, position.y, position.z * depth);

}
`;

const getUniforms = function() {
  return {
    diffuse: { value: undefined },
    depth: { value: 1 },
  };
}


exports.fs = fs;
exports.vs = vs;
exports.glslVersion = glslVersion;
exports.getUniforms = getUniforms;
