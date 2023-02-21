const THREE = require('three');

const glslVersion = null;

const fs =
`
uniform sampler3D texture0;
uniform sampler3D texture1;
uniform vec4 lookup_offsets, lookup_scales;
uniform vec4 texture_scaling, normal_scaling;
varying vec4 diffuse, ambientGlobal, ambient;

void main()
{
  vec4 color;
  vec3 n, reflV, viewV, ldir;
  float NdotL, NdotHV, len;
  float att;

  n = normalize(gl_TexCoord[3].xyz);
  vec3 tex = vec3(texture3D(texture0, vec3(gl_TexCoord[0])));
  color.xyz = tex.xyz;
  color.w = gl_FrontMaterial.diffuse.w;
  //Offset and scale to counteract effect of linear interpolation
  //starting at the middle of the first texel and finishing in the
  //middle of the last texel
  vec4  offsetcolour = color.rgbr * lookup_scales + lookup_offsets;
  vec4  dependentlookup = texture3D(texture1, vec3(offsetcolour));
  color.w = color.w * dependentlookup.r;
  vec4 unlitColour = color;
//Calculate a finite difference normal based on the magnitude of texture components used.
  vec4 position_up, position_down, tex_up, tex_down;
  vec4 stencil_xup = vec4(1, 0, 0, 0);
  position_up = stencil_xup * texture_scaling + gl_TexCoord[0];
  tex_up = texture3D(texture0, vec3(position_up));
  vec4 stencil_xdown = vec4(-1, 0, 0, 0);
  position_down = stencil_xdown * texture_scaling + gl_TexCoord[0];
  tex_down =  texture3D(texture0, vec3(position_down));
  n.x = sqrt(dot(vec3(tex_up - tex_down), vec3(tex_up - tex_down)));
  vec4 stencil_yup = vec4(0, 1, 0, 0);
  position_up = stencil_yup * texture_scaling + gl_TexCoord[0];
  tex_up = texture3D(texture0, vec3(position_up));
  vec4 stencil_ydown = vec4(0, -1, 0, 0);
  position_down = stencil_ydown * texture_scaling + gl_TexCoord[0];
  tex_down =  texture3D(texture0, vec3(position_down));
  n.y = sqrt(dot(vec3(tex_up - tex_down), vec3(tex_up - tex_down)));
  vec4 stencil_zup = vec4(0, 0, 1, 0);
  position_up = stencil_zup * texture_scaling + gl_TexCoord[0];
  tex_up = texture3D(texture0, vec3(position_up));
  vec4 stencil_zdown = vec4(0, 0, -1, 0);
  position_down = stencil_zdown * texture_scaling + gl_TexCoord[0];
  tex_down =  texture3D(texture0, vec3(position_down));
  n.z = sqrt(dot(vec3(tex_up - tex_down), vec3(tex_up - tex_down)));
  n = n * vec3(normal_scaling);
  vec3 eyeNormal = gl_NormalMatrix * n;
  if (!gl_FrontFacing)
    eyeNormal.z = -1.0 * eyeNormal.z;
  float normalMag = dot (eyeNormal, eyeNormal);
  eyeNormal = normalize(eyeNormal);
  len = length(vec3(gl_TexCoord[1]));
  att = 1.0 / (gl_LightSource[0].constantAttenuation +
    gl_LightSource[0].linearAttenuation * len +
    gl_LightSource[0].quadraticAttenuation * len * len);
  //Calculate attenuation.
  NdotL = (dot(eyeNormal, normalize(gl_TexCoord[1].xyz)));
  if (!gl_FrontFacing)
    NdotL = abs(NdotL);
  color += att * (diffuse *NdotL + ambient);
  reflV = reflect(-normalize(gl_TexCoord[1].xyz), eyeNormal);
  NdotHV = max(dot(reflV, normalize(gl_TexCoord[2].xyz)),0.0);
  color += att * gl_FrontMaterial.specular * gl_LightSource[0].specular *
    pow(NdotHV, gl_FrontMaterial.shininess);
  //Alpha value;
  color.w = unlitColour.w * normalMag;
  gl_FragColor = color;
}
`;

const vs = 
`
varying vec4 diffuse, ambientGlobal, ambient;
uniform vec4 texture_scaling;

void main()
{
  vec3 pos;
  diffuse = gl_FrontMaterial.diffuse * gl_LightSource[0].diffuse;
  ambient = gl_FrontMaterial.ambient * gl_LightSource[0].ambient;
  ambientGlobal = gl_LightModel.ambient * gl_FrontMaterial.ambient;
  vec4 ecPos = gl_ModelViewMatrix * gl_Vertex;
  vec3 aux = gl_LightSource[0].position.xyz - ecPos.xyz;
  gl_TexCoord[0] = texture_scaling * gl_MultiTexCoord0;
  gl_TexCoord[3].xyz = normalize(gl_NormalMatrix * gl_Normal);
  gl_TexCoord[2].xyz = vec3(normalize(-ecPos));
  gl_TexCoord[1].xyz = aux;
  gl_FrontColor = gl_Color;
  gl_BackColor = gl_Color;
  gl_FrontSecondaryColor = vec4(1.0);
  gl_BackSecondaryColor = vec4(0.0);
  gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;
}
`;

const getUniforms = function() {
  return {
		u_size: { value: new THREE.Vector3( 1, 1, 1 ) },
		u_renderstyle: { value: 0 },
		u_renderthreshold: { value: 0.5 },
		u_clim: { value: new THREE.Vector2( 1, 1 ) },
		u_data: { value: null },
		u_cmdata: { value: null },
  }
};

exports.fs = fs;
exports.vs = vs;
exports.glslVersion = glslVersion;
exports.getUniforms = getUniforms;
