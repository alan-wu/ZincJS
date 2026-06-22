const THREE = require('three');

const glslVersion = THREE.GLSL3;

const fs =
`
precision highp float;
precision highp int;
precision highp sampler2DArray;

uniform sampler2DArray diffuse0;
uniform sampler2DArray diffuse1;
uniform sampler2DArray mask;
uniform bool discardAlpha;
uniform bool maskEnabled;
uniform float brightness;
uniform float contrast;
uniform float time;
uniform int nChannels;
in vec3 vUw;

out vec4 outColor;

void main() {

  float color0 = texture( diffuse0, vUw ).r;
  float color1 = texture( diffuse1, vUw ).r;
  float color = mix(color0, color1, time);
  // discard if alpha is zero
  if (maskEnabled && discardAlpha) {
    float mask = texture(mask, vUw).r;
    if (mask == 0.0) discard;
  }

  // discard if alpha is zero
  //if (discardAlpha && color.a == 0.0) discard;
  // Apply brightness
  vec3 brightenedColor = vec3(color) + vec3(brightness);
  // Apply contrast
  vec3 contrastedColor = (brightenedColor - vec3(0.5)) * contrast + vec3(0.5);
  outColor = vec4(contrastedColor, 1.0);
}
`;

const vs =
`
out vec3 vUw;
uniform float depth;
uniform vec3 slide;
uniform int direction;
uniform bool flipY;
uniform bool flipZ;

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
  if (flipZ)
    slidePos.z = 1.0 - slidePos.z;

  vUw.xyz = vec3(slidePos.x, slidePos.y, slidePos.z * depth);

}
`;

const getUniforms = function() {
  return {
    brightness: { value: 0},
    contrast: { value: 1},
    depth: { value: 1 },
    discardAlpha: {value: true},
    diffuse0: { value: undefined },
    diffuse1: { value: undefined },
    direction: { value: 1 },
    flipY: { value: true },
    flipZ: { value: false },
    nChannels: { value: 1 },
    mask: { value: undefined },
    maskEnabled: { value: false },
    slide: { value: new THREE.Vector3( 0, 0, 1 ) },
    time: { value: 0 }
  };
}

exports.fs = fs;
exports.vs = vs;
exports.glslVersion = glslVersion;
exports.getUniforms = getUniforms;
