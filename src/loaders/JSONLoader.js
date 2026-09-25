import * as THREE from 'three/webgpu';
import { Loader } from '../three/Loader';
import { VideoHandler } from '../videoHandler';
import { getColorsRGB } from '../utilities';

const BufferAttribute = THREE.BufferAttribute;
const BufferGeometry = THREE.BufferGeometry;
const Color = THREE.Color;
const DefaultLoadingManager = THREE.DefaultLoadingManager;
const FileLoader = THREE.FileLoader;
const Float32BufferAttribute = THREE.Float32BufferAttribute;
const LoaderUtils = THREE.LoaderUtils;

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

  this.paramsString = "";

}

Object.assign( JSONLoader.prototype, {

	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var texturePath = this.texturePath && ( typeof this.texturePath === 'string' ) ? this.texturePath : LoaderUtils.extractUrlBase( url );

		var loader = new FileLoader( this.manager );

    const params = url.split("?");

    //There are parameters, add them to the target
    if (url.length === 2) {

      this.paramsString =  paramsStrings[1];

    } else {

      this.paramsString = "";

    }

		loader.setWithCredentials( this.withCredentials );
		loader.load( url, function ( text ) {

			var json = undefined;
			try {
        json = JSON.parse(text);
			} catch (e) {
				console.error("The loader has encountered an error while parsing the content of a resource.");
				if (onError) {
					onError({responseURL: url});
					return;
				}
			}

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

      if (scope && scope.parse) {
				try {
					var object = scope.parse( json, texturePath );
					onLoad( object.geometry, object.materials );
				} catch (e) {
					console.error("The loader has encountered aon loading the geometry");
					console.error(e);
					if (onError) {
						onError({responseURL: url});
						return;
					}
				}
			}
		}, onProgress, onError );

	},

	setTexturePath: function ( value ) {

		this.texturePath = value;

	},

	parse: ( function () {

		function isBitSet( value, position ) {

			return value & ( 1 << position );

		}

		//Walks json.faces once, decoding each triangle (quads are split into two)
		//into a flat vertex-index list plus a parallel per-triangle materialIndex,
		//in exactly the order the legacy Face3-based parser used to push faces -
		//that order is what computeGroups() below depends on.
		function parseFaces( json ) {

			const faces = json.faces;

			let nUvLayers = 0;
			if ( json.uvs !== undefined ) {

				for ( let i = 0; i < json.uvs.length; i ++ ) {

					if ( json.uvs[ i ].length ) nUvLayers ++;

				}

			}

			const indices = [];
			const materialIndices = [];

			let offset = 0;
			const zLength = faces.length;

			while ( offset < zLength ) {

				const type = faces[ offset ++ ];

				const isQuad = isBitSet( type, 0 );
				const hasMaterial = isBitSet( type, 1 );
				const hasFaceVertexUv = isBitSet( type, 3 );
				const hasFaceNormal = isBitSet( type, 4 );
				const hasFaceVertexNormal = isBitSet( type, 5 );
				const hasFaceColor = isBitSet( type, 6 );
				const hasFaceVertexColor = isBitSet( type, 7 );

				let a, b, c;

				if ( isQuad ) {

					const v0 = faces[ offset ];
					const v1 = faces[ offset + 1 ];
					const v2 = faces[ offset + 2 ];
					const v3 = faces[ offset + 3 ];

					offset += 4;

					let materialIndex = 0;
					if ( hasMaterial ) {

						materialIndex = faces[ offset ++ ];

					}

					if ( hasFaceVertexUv ) {

						offset += nUvLayers * 4;

					}

					if ( hasFaceNormal ) offset += 1;
					if ( hasFaceVertexNormal ) offset += 4;
					if ( hasFaceColor ) offset += 1;
					if ( hasFaceVertexColor ) offset += 4;

					indices.push( v0, v1, v3 );
					materialIndices.push( materialIndex );

					indices.push( v1, v2, v3 );
					materialIndices.push( materialIndex );

					continue;

				}

				a = faces[ offset ++ ];
				b = faces[ offset ++ ];
				c = faces[ offset ++ ];

        //A hack to get things going
        if (!b) b = a;
        if (!c) c = b;

				let materialIndex = 0;
				if ( hasMaterial ) {

					materialIndex = faces[ offset ++ ];

				}

				if ( hasFaceVertexUv ) {

					offset += nUvLayers * 3;

				}

				if ( hasFaceNormal ) offset += 1;
				if ( hasFaceVertexNormal ) offset += 3;
				if ( hasFaceColor ) offset += 1;
				if ( hasFaceVertexColor ) offset += 3;

				indices.push( a, b, c );
				materialIndices.push( materialIndex );

			}

			return { indices, materialIndices };

		}

		//Material-index run-length groups over the triangle list, matching
		//the legacy Geometry.prototype.computeGroups() this replaced.
		function computeGroups( materialIndices ) {

			const groups = [];
			let group;
			let materialIndex = undefined;

			for ( let i = 0; i < materialIndices.length; i ++ ) {

				if ( materialIndices[ i ] !== materialIndex ) {

					materialIndex = materialIndices[ i ];

					if ( group !== undefined ) {

						group.count = ( i * 3 ) - group.start;
						groups.push( group );

					}

					group = { start: i * 3, materialIndex: materialIndex };

				}

			}

			if ( group !== undefined ) {

				group.count = ( materialIndices.length * 3 ) - group.start;
				groups.push( group );

			}

			return groups;

		}

		//Computes per-vertex normals for a morph target's position set by
		//reusing the shared index and the standard BufferGeometry algorithm,
		//instead of hand-rolling face/vertex normal averaging.
		function computeMorphNormalAttribute( positionAttribute, indices ) {

			const scratch = new BufferGeometry();
			scratch.setIndex( indices );
			scratch.setAttribute( 'position', positionAttribute );
			scratch.computeVertexNormals();

			const normalAttribute = scratch.getAttribute( 'normal' );
			normalAttribute.name = positionAttribute.name;
			return normalAttribute;

		}

		function parseMorphTargets( json, scale ) {

			const morphPositions = [];

			if ( json.morphTargets !== undefined ) {

				for ( let i = 0, l = json.morphTargets.length; i < l; i ++ ) {

					const srcVertices = json.morphTargets[ i ].vertices;
					const array = new Float32Array( srcVertices.length );

					for ( let v = 0, vl = srcVertices.length; v < vl; v ++ ) {

						array[ v ] = srcVertices[ v ] * scale;

					}

					const attribute = new BufferAttribute( array, 3 );
					attribute.name = json.morphTargets[ i ].name;
					morphPositions.push( attribute );

				}

			}

			const morphNormals = [];

			if ( json.morphNormals !== undefined ) {

				for ( let i = 0, l = json.morphNormals.length; i < l; i ++ ) {

					if ( morphPositions[ i ] ) {

						const srcNormals = json.morphNormals[ i ].normals;
						const array = Float32Array.from( srcNormals );

						const attribute = new BufferAttribute( array, 3 );
						attribute.name = morphPositions[ i ].name;
						morphNormals[ i ] = attribute;

					}

				}

			}

			return { morphPositions, morphNormals };

		}

		//Reproduces copyMorphColorsToIndexedBufferGeometry()/getColorsRGB() from
		//src/utilities.js exactly (that path has no test coverage today, so the
		//arithmetic - odd as some of it looks - is ported unchanged rather than
		//redesigned here).
		function parseMorphColors( json ) {

			if ( json.morphColors === undefined ) return undefined;

			const morphAttributes = [];

			for ( let i = 0, l = json.morphColors.length; i < l; i ++ ) {

				const srcColors = json.morphColors[ i ].colors;
				const colors = [];

				for ( let c = 0, cl = srcColors.length; c < cl; c += 3 ) {

					const color = new Color( 0xffaa00 );
					color.setRGB( srcColors[ c ], srcColors[ c + 1 ], srcColors[ c + 2 ] );
					colors.push( color );

				}

				const colorArray = [];

				for ( let j = 0, jl = colors.length * 3; j < jl; j ++ ) {

					const rgb = getColorsRGB( colors, j );
					colorArray.push( rgb[ 0 ], rgb[ 1 ], rgb[ 2 ] );

				}

				const attribute = new Float32BufferAttribute( colorArray, 3 );
				attribute.name = json.morphColors[ i ].name;
				morphAttributes.push( attribute );

			}

			return morphAttributes;

		}

		return function parse( json, texturePath ) {

			if ( json.data !== undefined ) {

				// Geometry 4.0 spec
				json = json.data;

			}

			const scale = ( json.scale !== undefined ) ? 1.0 / json.scale : 1.0;

			const srcVertices = json.vertices;
			const vertexCount = srcVertices.length / 3;

			const positions = new Float32Array( srcVertices.length );
			for ( let i = 0, l = srcVertices.length; i < l; i ++ ) {

				positions[ i ] = srcVertices[ i ] * scale;

			}

			const geometry = new BufferGeometry();
			geometry.setAttribute( 'position', new BufferAttribute( positions, 3 ) );

			if ( json.normals !== undefined && json.normals.length > 0 ) {

				geometry.setAttribute( 'normal', new BufferAttribute( Float32Array.from( json.normals ), 3 ) );

			}

			if ( json.uvs !== undefined ) {

				if ( json.uvs[ 0 ] && json.uvs[ 0 ].length > 0 ) {

					geometry.setAttribute( 'uv', new BufferAttribute( Float32Array.from( json.uvs[ 0 ] ), 2 ) );

				}

				if ( json.uvs[ 1 ] && json.uvs[ 1 ].length > 0 ) {

					geometry.setAttribute( 'uv2', new BufferAttribute( Float32Array.from( json.uvs[ 1 ] ), 2 ) );

				}

			}

			if ( json.colors !== undefined && json.colors.length > 0 ) {

				const colorArray = new Float32Array( json.colors.length * 3 );

				for ( let i = 0, l = json.colors.length; i < l; i ++ ) {

					const color = new Color( json.colors[ i ] );
					colorArray[ i * 3 ] = color.r;
					colorArray[ i * 3 + 1 ] = color.g;
					colorArray[ i * 3 + 2 ] = color.b;

				}

				geometry.setAttribute( 'color', new BufferAttribute( colorArray, 3 ) );

			} else {

				const colorArray = new Float32Array( vertexCount * 3 ).fill( 1.0 );
				geometry.setAttribute( 'color', new BufferAttribute( colorArray, 3 ) );

			}

			const { indices, materialIndices } = parseFaces( json );

			if ( indices.length > 0 ) {

				geometry.setIndex( indices );
				geometry.groups = computeGroups( materialIndices );

			}

			const { morphPositions, morphNormals } = parseMorphTargets( json, scale );

			if ( morphPositions.length > 0 ) {

				geometry.morphAttributes.position = morphPositions;

				const resolvedMorphNormals = [];

				for ( let i = 0; i < morphPositions.length; i ++ ) {

					if ( morphNormals[ i ] ) {

						resolvedMorphNormals.push( morphNormals[ i ] );

					} else if ( indices.length > 0 ) {

						resolvedMorphNormals.push( computeMorphNormalAttribute( morphPositions[ i ], indices ) );

					}

				}

				if ( resolvedMorphNormals.length > 0 ) {

					geometry.morphAttributes.normal = resolvedMorphNormals;

				}

			}

			const morphColorAttributes = parseMorphColors( json );

			if ( morphColorAttributes !== undefined ) {

				geometry.morphAttributes.color = morphColorAttributes;

				//Support cases where only morphColorAttributes is available
        //without morphPositionAttributes
				if ( geometry.morphAttributes.position === undefined ) {

					const basePosition = geometry.getAttribute( 'position' );

					geometry.morphAttributes.position = morphColorAttributes.map( ( colorAttribute ) => {

						const positionAttribute = new BufferAttribute( basePosition.array, basePosition.itemSize );

						positionAttribute.name = colorAttribute.name;

						return positionAttribute;

					} );

				}

			}

			geometry.computeBoundingBox();
			geometry.computeBoundingSphere();

			if ( json.materials === undefined || json.materials.length === 0 ) {

				return { geometry: geometry };

			} else {

				var materials = Loader.prototype.initMaterials( json.materials, texturePath, 'Anonymous' );


				if (json.materials[0].video) {

					var fullPath = texturePath + json.materials[0].video;

          if (this.paramsString) {

            fullPath = fullPath + `?${this.paramsString}`;

          }

					const videoHandler = new VideoHandler(fullPath);

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
