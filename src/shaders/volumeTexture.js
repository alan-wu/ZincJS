const THREE = require('three');

const glslVersion = THREE.GLSL3;

const fs =
`
precision highp int;
precision highp float;

uniform highp sampler2DArray diffuse;
uniform ivec3 volume_dims;
uniform float depth;

in vec3 vray_dir;
flat in vec3 transformed_eye;

out vec4 color;

vec2 intersect_box(vec3 orig, vec3 dir) {
	const vec3 box_min = vec3(0);
	const vec3 box_max = vec3(1);
	vec3 inv_dir = 1.0 / dir;
	vec3 tmin_tmp = (box_min - orig) * inv_dir;
	vec3 tmax_tmp = (box_max - orig) * inv_dir;
	vec3 tmin = min(tmin_tmp, tmax_tmp);
	vec3 tmax = max(tmin_tmp, tmax_tmp);
	float t0 = max(tmin.x, max(tmin.y, tmin.z));
	float t1 = min(tmax.x, min(tmax.y, tmax.z));
	return vec2(t0, t1);
}

void main(void) {
	// Step 1: Normalize the view ray
	vec3 ray_dir = normalize(vray_dir);

	// Step 2: Intersect the ray with the volume bounds to find the interval
	// along the ray overlapped by the volume.
	vec2 t_hit = intersect_box(transformed_eye, ray_dir);
	if (t_hit.x > t_hit.y) {
		discard;
	}
	// We don't want to sample voxels behind the eye if it's
	// inside the volume, so keep the starting point at or in front
	// of the eye
	t_hit.x = max(t_hit.x, 0.0);

	// Step 3: Compute the step size to march through the volume grid
	vec3 dt_vec = 1.0 / (vec3(volume_dims) * abs(ray_dir));
	float dt = min(dt_vec.x, min(dt_vec.y, dt_vec.z));

	// Step 4: Starting from the entry point, march the ray through the volume
	// and sample it
	vec3 p = transformed_eye + t_hit.x * ray_dir;
  p.z = p.z * depth; 
	for (float t = t_hit.x; t < t_hit.y; t += dt) {
		// Step 4.1: Sample the volume, and color it by the transfer function.
		// Note that here we don't use the opacity from the transfer function,
		// and just use the sample value as the opacity
		vec3 tex = texture(diffuse, p).rgb;
		vec4 val_color = vec4(tex.rgb, 0.02);

		// Step 4.2: Accumulate the color and opacity using the front-to-back
		// compositing equation
		color.rgb += (1.0 - color.a) * val_color.a * val_color.rgb;
		color.a += (1.0 - color.a) * val_color.a;

		// Optimization: break out of the loop when the color is near opaque
		if (color.a >= 0.95) {
			break;
		}
		p += ray_dir * dt;
	}
}
`;

const vs = 
`
uniform vec3 volume_scale;

out vec3 vray_dir;
flat out vec3 transformed_eye;

void main(void) {
	// Translate the cube to center it at the origin.
	vec3 volume_translation = vec3(0.5) - volume_scale * 0.5;
	gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position * volume_scale + volume_translation, 1);
  volume_translation = vec3(modelMatrix * vec4(volume_translation, 1.0));

	// Compute eye position and ray directions in the unit cube space
	transformed_eye = (cameraPosition - volume_translation) / volume_scale;
	vray_dir = position - transformed_eye;
}
`;

const getUniforms = function() {
  return {
		volume_scale: { value: new THREE.Vector3( 1, 1, 1 ) },
    diffuse: { value: undefined },
    volume_dims: { value: [ 1, 1, 1 ] },
    depth: { value: 1 },
  }
};

exports.fs = fs;
exports.vs = vs;
exports.glslVersion = glslVersion;
exports.getUniforms = getUniforms;
