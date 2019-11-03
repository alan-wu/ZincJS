var THREE = require('three');

var Sphere = THREE.Sphere;
var Ray = THREE.Ray;
var Matrix4 = THREE.Matrix4;
var Object3D = THREE.Object3D;
var Vector3 = THREE.Vector3;
var LineBasicMaterial = THREE.LineBasicMaterial;
var BufferGeometry = THREE.BufferGeometry;
var Float32BufferAttribute = THREE.Float32BufferAttribute;

/**
 * @author mrdoob / http://mrdoob.com/
 */

function Line( geometry, material, mode ) {

	if ( mode === 1 ) {

		console.error( 'THREE.Line: parameter THREE.LinePieces no longer supported. Use THREE.LineSegments instead.' );

	}

	Object3D.call( this );

	this.type = 'Line';

	this.geometry = geometry !== undefined ? geometry : new BufferGeometry();
	this.material = material !== undefined ? material : new LineBasicMaterial( { color: Math.random() * 0xffffff } );

	this.updateMorphTargets();

}

Line.prototype = Object.assign( Object.create( Object3D.prototype ), {

	constructor: Line,

	isLine: true,

	computeLineDistances: ( function () {

		var start = new Vector3();
		var end = new Vector3();

		return function computeLineDistances() {

			var geometry = this.geometry;

			if ( geometry.isBufferGeometry ) {

				// we assume non-indexed geometry

				if ( geometry.index === null ) {

					var positionAttribute = geometry.attributes.position;
					var lineDistances = [ 0 ];

					for ( var i = 1, l = positionAttribute.count; i < l; i ++ ) {

						start.fromBufferAttribute( positionAttribute, i - 1 );
						end.fromBufferAttribute( positionAttribute, i );

						lineDistances[ i ] = lineDistances[ i - 1 ];
						lineDistances[ i ] += start.distanceTo( end );

					}

					geometry.addAttribute( 'lineDistance', new Float32BufferAttribute( lineDistances, 1 ) );

				} else {

					console.warn( 'THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.' );

				}

			} else if ( geometry.isGeometry ) {

				var vertices = geometry.vertices;
				var lineDistances = geometry.lineDistances;

				lineDistances[ 0 ] = 0;

				for ( var i = 1, l = vertices.length; i < l; i ++ ) {

					lineDistances[ i ] = lineDistances[ i - 1 ];
					lineDistances[ i ] += vertices[ i - 1 ].distanceTo( vertices[ i ] );

				}

			}

			return this;

		};

	}() ),

	copy: function ( source ) {

		Object3D.prototype.copy.call( this, source );

		if ( source.morphTargetInfluences !== undefined ) {

			this.morphTargetInfluences = source.morphTargetInfluences.slice();

		}

		if ( source.morphTargetDictionary !== undefined ) {

			this.morphTargetDictionary = Object.assign( {}, source.morphTargetDictionary );

		}

		return this;

	},

	updateMorphTargets: function () {

		var geometry = this.geometry;
		var m, ml, name;

		if ( geometry.isBufferGeometry ) {

			var morphAttributes = geometry.morphAttributes;
			var keys = Object.keys( morphAttributes );

			if ( keys.length > 0 ) {

				var morphAttribute = morphAttributes[ keys[ 0 ] ];

				if ( morphAttribute !== undefined ) {

					this.morphTargetInfluences = [];
					this.morphTargetDictionary = {};

					for ( m = 0, ml = morphAttribute.length; m < ml; m ++ ) {

						name = morphAttribute[ m ].name || String( m );

						this.morphTargetInfluences.push( 0 );
						this.morphTargetDictionary[ name ] = m;

					}

				}

			}

		} else {

			var morphTargets = geometry.morphTargets;

			if ( morphTargets !== undefined && morphTargets.length > 0 ) {

				console.error( 'THREE.Line.updateMorphTargets() does not supports THREE.Geometry. Use THREE.BufferGeometry instead.' );

			}

		}

	},

	raycast: ( function () {

		var inverseMatrix = new Matrix4();
		var ray = new Ray();
		var sphere = new Sphere();

		var vStart = new Vector3();
		var vEnd = new Vector3();

		var morphA = new Vector3();
		var morphB = new Vector3();

		var tempA = new Vector3();
		var tempB = new Vector3();

		function calculatePosition( object, material, position, morphPosition, a, b )	{

			vStart.fromBufferAttribute( position, a );
			vEnd.fromBufferAttribute( position, b );

			var morphInfluences = object.morphTargetInfluences;

			if ( material.morphTargets && morphPosition && morphInfluences ) {

				morphA.set( 0, 0, 0 );
				morphB.set( 0, 0, 0 );

				for ( var i = 0, il = morphPosition.length; i < il; i ++ ) {

					var influence = morphInfluences[ i ];
					var morphAttribute = morphPosition[ i ];

					if ( influence === 0 ) continue;

					tempA.fromBufferAttribute( morphAttribute, a );
					tempB.fromBufferAttribute( morphAttribute, b );

					morphA.addScaledVector( tempA.sub( vStart ), influence );
					morphB.addScaledVector( tempB.sub( vEnd ), influence );

				}

				vStart.add( morphA );
				vEnd.add( morphB );

			}

		}

		return function raycast( raycaster, intersects ) {

			var precision = raycaster.linePrecision;

			var geometry = this.geometry;
			var material = this.material;
			var matrixWorld = this.matrixWorld;

			// Checking boundingSphere distance to ray

			if ( geometry.boundingSphere === null ) geometry.computeBoundingSphere();

			sphere.copy( geometry.boundingSphere );
			sphere.applyMatrix4( matrixWorld );
			sphere.radius += precision;

			if ( raycaster.ray.intersectsSphere( sphere ) === false ) return;

			//

			inverseMatrix.getInverse( matrixWorld );
			ray.copy( raycaster.ray ).applyMatrix4( inverseMatrix );

			var localPrecision = precision / ( ( this.scale.x + this.scale.y + this.scale.z ) / 3 );
			var localPrecisionSq = localPrecision * localPrecision;

			var interSegment = new Vector3();
			var interRay = new Vector3();
			var step = ( this && this.isLineSegments ) ? 2 : 1;

			if ( geometry.isBufferGeometry ) {

				var index = geometry.index;
				var positions = geometry.attributes.position;
				var morphPosition = geometry.morphAttributes.position;

				if ( index !== null ) {

					var indices = index.array;

					for ( var i = 0, l = indices.length - 1; i < l; i += step ) {

						var a = indices[ i ];
						var b = indices[ i + 1 ];

						calculatePosition( this, material, positions, morphPosition, a, b );

						var distSq = ray.distanceSqToSegment( vStart, vEnd, interRay, interSegment );

						if ( distSq > localPrecisionSq ) continue;

						interRay.applyMatrix4( this.matrixWorld ); //Move back to world space for distance calculation

						var distance = raycaster.ray.origin.distanceTo( interRay );

						if ( distance < raycaster.near || distance > raycaster.far ) continue;

						intersects.push( {

							distance: distance,
							// What do we want? intersection point on the ray or on the segment??
							// point: raycaster.ray.at( distance ),
							point: interSegment.clone().applyMatrix4( this.matrixWorld ),
							index: i,
							face: null,
							faceIndex: null,
							object: this

						} );

					}

				} else {

					for ( var i = 0, l = positions.count - 1; i < l; i += step ) {

						calculatePosition( this, material, positions, morphPosition, i, i + 1 );


						var distSq = ray.distanceSqToSegment( vStart, vEnd, interRay, interSegment );

						if ( distSq > localPrecisionSq ) continue;

						interRay.applyMatrix4( this.matrixWorld ); //Move back to world space for distance calculation

						var distance = raycaster.ray.origin.distanceTo( interRay );

						if ( distance < raycaster.near || distance > raycaster.far ) continue;

						intersects.push( {

							distance: distance,
							// What do we want? intersection point on the ray or on the segment??
							// point: raycaster.ray.at( distance ),
							point: interSegment.clone().applyMatrix4( this.matrixWorld ),
							index: i,
							face: null,
							faceIndex: null,
							object: this

						} );

					}

				}

			} else if ( geometry.isGeometry ) {

				var vertices = geometry.vertices;
				var nbVertices = vertices.length;

				for ( var i = 0; i < nbVertices - 1; i += step ) {

					var distSq = ray.distanceSqToSegment( vertices[ i ], vertices[ i + 1 ], interRay, interSegment );

					if ( distSq > localPrecisionSq ) continue;

					interRay.applyMatrix4( this.matrixWorld ); //Move back to world space for distance calculation

					var distance = raycaster.ray.origin.distanceTo( interRay );

					if ( distance < raycaster.near || distance > raycaster.far ) continue;

					intersects.push( {

						distance: distance,
						// What do we want? intersection point on the ray or on the segment??
						// point: raycaster.ray.at( distance ),
						point: interSegment.clone().applyMatrix4( this.matrixWorld ),
						index: i,
						face: null,
						faceIndex: null,
						object: this

					} );

				}

			}

		};

	}() ),

	clone: function () {

		return new this.constructor( this.geometry, this.material ).copy( this );

	}

} );


export { Line };
