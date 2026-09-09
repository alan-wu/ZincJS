
/**
 * Provide additional shaders to render time dependent color.
 */

const augmentMorphColor = function(shader) {
  shader.vertexShader = shader.vertexShader.replace(
      '#include <morphcolor_vertex>',
      `
      #if defined( USE_MORPHCOLORS )

      // morphTargetBaseInfluence is set based on BufferGeometry.morphTargetsRelative value:
      // When morphTargetsRelative is false, this is set to 1 - sum(influences); this results in normal = sum((target - base) * influence)
      // When morphTargetsRelative is true, this is set to 1; as a result, all morph targets are simply added to the base after weighting
      vColor *= morphTargetBaseInfluence;

      for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {

        #if defined( USE_COLOR_ALPHA )

          if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];

        #elif defined( USE_COLOR )

          if ( morphTargetInfluences[ i ] != 0.0 ) {
            vColor.rgb += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
            vColor.a = 1.0;
          }

        #endif

      }

      #endif
      `
  );
}

const printShader = function (shader) {
  console.log(shader.vertexShader);
  console.log(shader.fragmentShader);
}


export { augmentMorphColor, printShader };
