var THREE = require('three');
var Sphere = THREE.Sphere;
var Ray = THREE.Ray;
var Matrix4 = THREE.Matrix4;
var Object3D = THREE.Object3D;
var Vector3 = THREE.Vector3;
var PointsMaterial = THREE.PointsMaterial;
var BufferGeometry = THREE.BufferGeometry;


/**
 * @author alteredq / http://alteredqualia.com/
 */

function Points( geometry, material ) {

	Object3D.call( this );

	this.type = 'Points';

	this.geometry = geometry !== undefined ? geometry : new BufferGeometry();
	this.material = material !== undefined ? material : new PointsMaterial( { color: Math.random() * 0xffffff } );

	this.updateMorphTargets();
}

Points.prototype = Object.assign( Object.create( Object3D.prototype ), {

	constructor: Points,

	isPoints: true,

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

		var vPoint = new Vector3();

		var morphA = new Vector3();

		var tempA = new Vector3();

		function calculatePosition( object, material, position, morphPosition, a)	{

			vPoint.fromBufferAttribute( position, a );

			var morphInfluences = object.morphTargetInfluences;

			if ( material.morphTargets && morphPosition && morphInfluences ) {

				morphA.set( 0, 0, 0 );

				for ( var i = 0, il = morphPosition.length; i < il; i ++ ) {

					var influence = morphInfluences[ i ];
					var morphAttribute = morphPosition[ i ];

					if ( influence === 0 ) continue;

					tempA.fromBufferAttribute( morphAttribute, a );

					morphA.addScaledVector( tempA.sub( vPoint ), influence );

				}

				vPoint.add( morphA );

			}

		}

		return function raycast( raycaster, intersects ) {

			var object = this;
			var geometry = this.geometry;
			var matrixWorld = this.matrixWorld;
			var material = this.material;
			var threshold = raycaster.params.Points.threshold;

			// Checking boundingSphere distance to ray
			
			if ( geometry.isBufferGeometry || this.material.morphTargets !== true ) {
	
				if ( geometry.boundingSphere === null ) geometry.computeBoundingSphere();
	
				sphere.copy( geometry.boundingSphere );
				sphere.applyMatrix4( matrixWorld );
				sphere.radius += threshold;
	
				if ( raycaster.ray.intersectsSphere( sphere ) === false ) return;
	
				//
	
				inverseMatrix.getInverse( matrixWorld );
				ray.copy( raycaster.ray ).applyMatrix4( inverseMatrix );
			}

			var localThreshold = threshold / ( ( this.scale.x + this.scale.y + this.scale.z ) / 3 );
			var localThresholdSq = localThreshold * localThreshold;
			var intersectPoint = new Vector3();

			function testPoint( point, index ) {

				var rayPointDistanceSq = ray.distanceSqToPoint( point );

				if ( rayPointDistanceSq < localThresholdSq ) {

					ray.closestPointToPoint( point, intersectPoint );
					intersectPoint.applyMatrix4( matrixWorld );

					var distance = raycaster.ray.origin.distanceTo( intersectPoint );

					if ( distance < raycaster.near || distance > raycaster.far ) return;

					intersects.push( {

						distance: distance,
						distanceToRay: Math.sqrt( rayPointDistanceSq ),
						point: intersectPoint.clone(),
						index: index,
						face: null,
						object: object

					} );

				}

			}

			if ( geometry.isBufferGeometry ) {

				var index = geometry.index;
				var positions = geometry.attributes.position;
				var morphPosition = geometry.morphAttributes.position;

				if ( index !== null ) {

					var indices = index.array;

					for ( var i = 0, il = indices.length; i < il; i ++ ) {

						var a = indices[ i ];

						calculatePosition( this, material, positions, morphPosition, a );

						testPoint( vPoint, a );

					}

				} else {

					for ( var i = 0, l = positions.count; i < l; i ++ ) {

						calculatePosition( this, material, positions, morphPosition, i );

						testPoint( vPoint, i );

					}

				}

			} else {

				var vertices = geometry.vertices;
				
				if ( this.material.morphTargets === true ) {
					var newVertices = [];
					var morphTargets = geometry.morphTargets;
					var morphInfluences = this.morphTargetInfluences;
					
					
					var ll = vertices.length;
					
					var temp = new Vector3();
					for (var l = 0; l < ll; l ++) {
						var v = new Vector3();
						var vA = vertices[ l ];
						
						v.set( 0, 0, 0 );
						
						for ( var t = 0, tl = morphTargets.length; t < tl; t ++ ) {
	
							var influence = morphInfluences[ t ];
	
							if ( influence === 0 ) continue;
	
							var targets = morphTargets[ t ].vertices;
	
							v.addScaledVector( temp.subVectors( targets[ l ], vA ), influence );
	
						}
						
						v.add( vA );

						newVertices.push(v);
					}
					
					vertices = newVertices;

					sphere.setFromPoints(vertices);
					sphere.applyMatrix4( matrixWorld );
					sphere.radius += threshold;
		
					if ( raycaster.ray.intersectsSphere( sphere ) === false ) return;
		
					//
		
					inverseMatrix.getInverse( matrixWorld );
					ray.copy( raycaster.ray ).applyMatrix4( inverseMatrix );
				}
				
				

				for ( var i = 0, l = vertices.length; i < l; i ++ ) {

					testPoint( vertices[ i ], i );

				}

			}

		};

	}() ),

	clone: function () {

		return new this.constructor( this.geometry, this.material ).copy( this );

	}

} );


export { Points };
