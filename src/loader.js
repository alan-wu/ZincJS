var THREE = require('three');

var Loader = require('./three/Loader').Loader;
var LoaderUtils = THREE.LoaderUtils;
var AnimationClip = THREE.AnimationClip;
var Vector3 = THREE.Vector3;
var Vector4 = THREE.Vector4;
var Color = THREE.Color;
var Vector2 = THREE.Vector2;
var Face3 = require('./three/Geometry').Face3;
var Geometry = require('./three/Geometry').Geometry;
var FileLoader = THREE.FileLoader;
var DefaultLoadingManager = THREE.DefaultLoadingManager;

/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 */

function JSONLoader( manager ) {

	if ( typeof manager === 'boolean' ) {

		console.warn( 'THREE.JSONLoader: showStatus parameter has been removed from constructor.' );
		manager = undefined;

	}

	this.manager = ( manager !== undefined ) ? manager : DefaultLoadingManager;

	this.withCredentials = false;

}

Object.assign( JSONLoader.prototype, {

	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var texturePath = this.texturePath && ( typeof this.texturePath === 'string' ) ? this.texturePath : LoaderUtils.extractUrlBase( url );

		var loader = new FileLoader( this.manager );
		loader.setWithCredentials( this.withCredentials );
		loader.load( url, function ( text ) {

			var json = JSON.parse( text );
			var metadata = json.metadata;

			if ( metadata !== undefined ) {

				var type = metadata.type;

				if ( type !== undefined ) {

					if ( type.toLowerCase() === 'object' ) {

						console.error( 'THREE.JSONLoader: ' + url + ' should be loaded with THREE.ObjectLoader instead.' );
						return;

					}

				}

			}

			var object = scope.parse( json, texturePath );
			onLoad( object.geometry, object.materials );

		}, onProgress, onError );

	},

	setTexturePath: function ( value ) {

		this.texturePath = value;

	},

	parse: ( function () {

		function parseModel( json, geometry ) {

			function isBitSet( value, position ) {

				return value & ( 1 << position );

			}

			var i, j, fi,

				offset, zLength,

				colorIndex, normalIndex, uvIndex, materialIndex,

				type,
				isQuad,
				hasMaterial,
				hasFaceVertexUv,
				hasFaceNormal, hasFaceVertexNormal,
				hasFaceColor, hasFaceVertexColor,

				vertex, face, faceA, faceB, hex, normal,

				uvLayer, uv, u, v,

				faces = json.faces,
				vertices = json.vertices,
				normals = json.normals,
				colors = json.colors,

				scale = json.scale,

				nUvLayers = 0;


			if ( json.uvs !== undefined ) {

				// disregard empty arrays

				for ( i = 0; i < json.uvs.length; i ++ ) {

					if ( json.uvs[ i ].length ) nUvLayers ++;

				}

				for ( i = 0; i < nUvLayers; i ++ ) {

					geometry.faceVertexUvs[ i ] = [];

				}

			}

			offset = 0;
			zLength = vertices.length;

			while ( offset < zLength ) {

				vertex = new Vector3();

				vertex.x = vertices[ offset ++ ] * scale;
				vertex.y = vertices[ offset ++ ] * scale;
				vertex.z = vertices[ offset ++ ] * scale;

				geometry.vertices.push( vertex );

			}

			offset = 0;
			zLength = faces.length;

      if (json.uvs) {

        for ( i = 0; i < json.uvs.length; i ++ ) {

          geometry.uvs[i] = [];

          for ( let k = 0; k < json.uvs[i].length ; k++ ) {

            geometry.uvs[i][k] = json.uvs[i][k];

          }
          
        }
        
      }

      if (normals) {

        for ( i = 0; i < normals.length; i ++ ) {

          geometry.normals[i] = normals[i];

        }
        
      }

      if (colors) {

        for ( i = 0; i < colors.length; i ++ ) {

          geometry.colors[i] = colors[i];

        }
        
      }


			while ( offset < zLength ) {

				type = faces[ offset ++ ];

				isQuad = isBitSet( type, 0 );
				hasMaterial = isBitSet( type, 1 );
				hasFaceVertexUv = isBitSet( type, 3 );
				hasFaceNormal = isBitSet( type, 4 );
				hasFaceVertexNormal = isBitSet( type, 5 );
				hasFaceColor = isBitSet( type, 6 );
				hasFaceVertexColor = isBitSet( type, 7 );

				// console.log("type", type, "bits", isQuad, hasMaterial, hasFaceVertexUv, hasFaceNormal, hasFaceVertexNormal, hasFaceColor, hasFaceVertexColor);

				if ( isQuad ) {

					faceA = new Face3();
					faceA.a = faces[ offset ];
					faceA.b = faces[ offset + 1 ];
					faceA.c = faces[ offset + 3 ];

					faceB = new Face3();
					faceB.a = faces[ offset + 1 ];
					faceB.b = faces[ offset + 2 ];
					faceB.c = faces[ offset + 3 ];

					offset += 4;

					if ( hasMaterial ) {

						materialIndex = faces[ offset ++ ];
						faceA.materialIndex = materialIndex;
						faceB.materialIndex = materialIndex;

					}

					// to get face <=> uv index correspondence

					fi = geometry.faces.length;

					if ( hasFaceVertexUv ) {

						for ( i = 0; i < nUvLayers; i ++ ) {

							uvLayer = json.uvs[ i ];

							geometry.faceVertexUvs[ i ][ fi ] = [];
							geometry.faceVertexUvs[ i ][ fi + 1 ] = [];

							for ( j = 0; j < 4; j ++ ) {

								uvIndex = faces[ offset ++ ];

								u = uvLayer[ uvIndex * 2 ];
								v = uvLayer[ uvIndex * 2 + 1 ];

								uv = new Vector2( u, v );

								if ( j !== 2 ) geometry.faceVertexUvs[ i ][ fi ].push( uv );
								if ( j !== 0 ) geometry.faceVertexUvs[ i ][ fi + 1 ].push( uv );

							}

						}

					}

					if ( hasFaceNormal ) {

						normalIndex = faces[ offset ++ ] * 3;

						faceA.normal.set(
							normals[ normalIndex ++ ],
							normals[ normalIndex ++ ],
							normals[ normalIndex ]
						);

						faceB.normal.copy( faceA.normal );

					}

					if ( hasFaceVertexNormal ) {

						for ( i = 0; i < 4; i ++ ) {

							normalIndex = faces[ offset ++ ] * 3;

							normal = new Vector3(
								normals[ normalIndex ++ ],
								normals[ normalIndex ++ ],
								normals[ normalIndex ]
							);


							if ( i !== 2 ) faceA.vertexNormals.push( normal );
							if ( i !== 0 ) faceB.vertexNormals.push( normal );

						}

					}


					if ( hasFaceColor ) {

						colorIndex = faces[ offset ++ ];
						hex = colors[ colorIndex ];

						faceA.color.setHex( hex );
						faceB.color.setHex( hex );

					}


					if ( hasFaceVertexColor ) {

						for ( i = 0; i < 4; i ++ ) {

							colorIndex = faces[ offset ++ ];
							hex = colors[ colorIndex ];

							if ( i !== 2 ) faceA.vertexColors.push( new Color( hex ) );
							if ( i !== 0 ) faceB.vertexColors.push( new Color( hex ) );

						}

					}

					geometry.faces.push( faceA );
					geometry.faces.push( faceB );

				} else {

					face = new Face3();
					face.a = faces[ offset ++ ];
					face.b = faces[ offset ++ ];
					face.c = faces[ offset ++ ];

					if ( hasMaterial ) {

						materialIndex = faces[ offset ++ ];
						face.materialIndex = materialIndex;

					}

					// to get face <=> uv index correspondence

					fi = geometry.faces.length;

					if ( hasFaceVertexUv ) {

						for ( i = 0; i < nUvLayers; i ++ ) {

							uvLayer = json.uvs[ i ];

							geometry.faceVertexUvs[ i ][ fi ] = [];

							for ( j = 0; j < 3; j ++ ) {

								uvIndex = faces[ offset ++ ];

								u = uvLayer[ uvIndex * 2 ];
								v = uvLayer[ uvIndex * 2 + 1 ];

								uv = new Vector2( u, v );

								geometry.faceVertexUvs[ i ][ fi ].push( uv );

							}

						}

					}

					if ( hasFaceNormal ) {

						normalIndex = faces[ offset ++ ] * 3;

						face.normal.set(
							normals[ normalIndex ++ ],
							normals[ normalIndex ++ ],
							normals[ normalIndex ]
						);

					}

					if ( hasFaceVertexNormal ) {

						for ( i = 0; i < 3; i ++ ) {

							normalIndex = faces[ offset ++ ] * 3;

							normal = new Vector3(
								normals[ normalIndex ++ ],
								normals[ normalIndex ++ ],
								normals[ normalIndex ]
							);

							face.vertexNormals.push( normal );

						}

					}


					if ( hasFaceColor ) {

						colorIndex = faces[ offset ++ ];
						face.color.setHex( colors[ colorIndex ] );

					}


					if ( hasFaceVertexColor ) {

						for ( i = 0; i < 3; i ++ ) {

							colorIndex = faces[ offset ++ ];
							face.vertexColors.push( new Color( colors[ colorIndex ] ) );

						}

					}

					geometry.faces.push( face );

				}

			}

		}

		function parseSkin( json, geometry ) {

			var influencesPerVertex = ( json.influencesPerVertex !== undefined ) ? json.influencesPerVertex : 2;

			if ( json.skinWeights ) {

				for ( var i = 0, l = json.skinWeights.length; i < l; i += influencesPerVertex ) {

					var x = json.skinWeights[ i ];
					var y = ( influencesPerVertex > 1 ) ? json.skinWeights[ i + 1 ] : 0;
					var z = ( influencesPerVertex > 2 ) ? json.skinWeights[ i + 2 ] : 0;
					var w = ( influencesPerVertex > 3 ) ? json.skinWeights[ i + 3 ] : 0;

					geometry.skinWeights.push( new Vector4( x, y, z, w ) );

				}

			}

			if ( json.skinIndices ) {

				for ( var i = 0, l = json.skinIndices.length; i < l; i += influencesPerVertex ) {

					var a = json.skinIndices[ i ];
					var b = ( influencesPerVertex > 1 ) ? json.skinIndices[ i + 1 ] : 0;
					var c = ( influencesPerVertex > 2 ) ? json.skinIndices[ i + 2 ] : 0;
					var d = ( influencesPerVertex > 3 ) ? json.skinIndices[ i + 3 ] : 0;

					geometry.skinIndices.push( new Vector4( a, b, c, d ) );

				}

			}

			geometry.bones = json.bones;

			if ( geometry.bones && geometry.bones.length > 0 && ( geometry.skinWeights.length !== geometry.skinIndices.length || geometry.skinIndices.length !== geometry.vertices.length ) ) {

				console.warn( 'When skinning, number of vertices (' + geometry.vertices.length + '), skinIndices (' +
					geometry.skinIndices.length + '), and skinWeights (' + geometry.skinWeights.length + ') should match.' );

			}

		}

		function parseMorphing( json, geometry ) {

			var scale = json.scale;

			if ( json.morphTargets !== undefined ) {

				for ( var i = 0, l = json.morphTargets.length; i < l; i ++ ) {

					geometry.morphTargets[ i ] = {};
					geometry.morphTargets[ i ].name = json.morphTargets[ i ].name;
					geometry.morphTargets[ i ].vertices = [];

					var dstVertices = geometry.morphTargets[ i ].vertices;
					var srcVertices = json.morphTargets[ i ].vertices;

					for ( var v = 0, vl = srcVertices.length; v < vl; v += 3 ) {

						var vertex = new Vector3();
						vertex.x = srcVertices[ v ] * scale;
						vertex.y = srcVertices[ v + 1 ] * scale;
						vertex.z = srcVertices[ v + 2 ] * scale;

						dstVertices.push( vertex );

					}

				}

			}

			if ( json.morphNormals !== undefined ) {

				for ( var i = 0, l = json.morphNormals.length; i < l; i ++ ) {

          if (geometry.morphTargets[ i ]) {

            geometry.morphTargets[ i ].normals = [];

            var dstNormals = geometry.morphTargets[ i ].normals;
            var srcNormals = json.morphNormals[ i ].normals;

            for ( var v = 0, vl = srcNormals.length; v < vl; v += 3 ) {

              var normals = new Vector3();
              normals.x = srcNormals[ v ];
              normals.y = srcNormals[ v + 1 ] ;
              normals.z = srcNormals[ v + 2 ] ;

              dstNormals.push( normals );

            }

            geometry.morphNormalsReady = true;

          }

				}

			}

			if ( json.morphColors !== undefined ) {

				var i, l, c, cl, dstColors, srcColors, color;

				for ( i = 0, l = json.morphColors.length; i < l; i ++ ) {

					geometry.morphColors[ i ] = {};
					geometry.morphColors[ i ].name = json.morphColors[ i ].name;
					geometry.morphColors[ i ].colors = [];

					dstColors = geometry.morphColors[ i ].colors;
					srcColors = json.morphColors[ i ].colors;

					for ( c = 0, cl = srcColors.length; c < cl; c += 3 ) {

						color = new THREE.Color( 0xffaa00 );
						color.setRGB( srcColors[ c ], srcColors[ c + 1 ], srcColors[ c + 2 ] );
						dstColors.push( color );

					}

				}

			}

		}

		function parseAnimations( json, geometry ) {

			var outputAnimations = [];

			// parse old style Bone/Hierarchy animations
			var animations = [];

			if ( json.animation !== undefined ) {

				animations.push( json.animation );

			}

			if ( json.animations !== undefined ) {

				if ( json.animations.length ) {

					animations = animations.concat( json.animations );

				} else {

					animations.push( json.animations );

				}

			}

			for ( var i = 0; i < animations.length; i ++ ) {

				var clip = AnimationClip.parseAnimation( animations[ i ], geometry.bones );
				if ( clip ) outputAnimations.push( clip );

			}

			// parse implicit morph animations
			if ( geometry.morphTargets ) {

				// TODO: Figure out what an appropraite FPS is for morph target animations -- defaulting to 10, but really it is completely arbitrary.
				var morphAnimationClips = AnimationClip.CreateClipsFromMorphTargetSequences( geometry.morphTargets, 10 );
				outputAnimations = outputAnimations.concat( morphAnimationClips );

			}

			if ( outputAnimations.length > 0 ) geometry.animations = outputAnimations;

		}

		return function parse( json, texturePath ) {

			if ( json.data !== undefined ) {

				// Geometry 4.0 spec
				json = json.data;

			}

			if ( json.scale !== undefined ) {

				json.scale = 1.0 / json.scale;

			} else {

				json.scale = 1.0;

			}

			var geometry = new Geometry();
			geometry.morphColors = [];
			parseModel( json, geometry );
			parseSkin( json, geometry );
			parseMorphing( json, geometry );
			parseAnimations( json, geometry );

			geometry.computeFaceNormals();
			geometry.computeBoundingSphere();

			if ( json.materials === undefined || json.materials.length === 0 ) {

				return { geometry: geometry };

			} else {

				var materials = Loader.prototype.initMaterials( json.materials, texturePath, 'Anonymous' );

				
				if (json.materials[0].video) {
					
					var fullPath = texturePath + json.materials[0].video;
					
					const videoHandler = new (require('./videoHandler').VideoHandler)(fullPath);
					
					geometry._video = videoHandler;
				
				}
				
				if (materials && materials.length > 0) {
					if (json.materials[0].singleSided) {
						materials[0].side = THREE.FrontSide;
					} else if (json.materials[0].flipSided){
						materials[0].side = THREE.BackSide;
					} else {
						materials[0].side = THREE.DoubleSide;
          }
          if (json.materials[0].specularCoef) {
            materials[0].shininess = Math.floor(json.materials[0].specularCoef / 3);
          }
				}
				
				return { geometry: geometry, materials: materials };

			}

		};

	} )()

} );


export { JSONLoader };
