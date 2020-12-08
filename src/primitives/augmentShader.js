exports.augmentMorphColor = function() {
    return function(shader) {
        shader.vertexShader = shader.vertexShader.replace(
            '#include <color_pars_vertex>',
            [
	            'varying vec3 vColor;',
                'attribute vec3 morphColor0;',
                'attribute vec3 morphColor1;'
            ].join( '\n' )
        );
        shader.vertexShader = shader.vertexShader.replace(
            '#include <color_vertex>',
            [
                'vColor.xyz = color.xyz;',
                '#ifdef USE_MORPHTARGETS',
                'vColor = morphColor0 * morphTargetInfluences[ 0 ];',
                'vColor += morphColor1 * morphTargetInfluences[ 1 ];',
                '#endif'
            ].join( '\n' )
        );
    };
}
