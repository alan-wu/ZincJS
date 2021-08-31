import {
	BufferGeometry,
	Matrix4,
  Object3D,
  PointsMaterial,
  Ray,
	Sphere,
	Vector3
} from 'three';


const _inverseMatrix = /*@__PURE__*/ new Matrix4();
const _ray = /*@__PURE__*/ new Ray();
const _sphere = /*@__PURE__*/ new Sphere();
const _position = /*@__PURE__*/ new Vector3();
const _morphA = /*@__PURE__*/ new Vector3();
const _tempA = /*@__PURE__*/ new Vector3();

class Points extends Object3D {

	constructor( geometry = new BufferGeometry(), material = new PointsMaterial() ) {

		super();

		this.type = 'Points';

		this.geometry = geometry;
		this.material = material;

		this.updateMorphTargets();

	}

	copy( source ) {

		super.copy( source );

		this.material = source.material;
		this.geometry = source.geometry;

		return this;

	}

	raycast( raycaster, intersects ) {

		const geometry = this.geometry;
		const matrixWorld = this.matrixWorld;
		const threshold = raycaster.params.Points.threshold;
    const drawRange = geometry.drawRange;

		// Checking boundingSphere distance to ray

		if ( geometry.boundingSphere === null ) geometry.computeBoundingSphere();

		_sphere.copy( geometry.boundingSphere );
		_sphere.applyMatrix4( matrixWorld );
		_sphere.radius += threshold;

		if ( raycaster.ray.intersectsSphere( _sphere ) === false ) return;

		//

		_inverseMatrix.copy( matrixWorld ).invert();
		_ray.copy( raycaster.ray ).applyMatrix4( _inverseMatrix );

		const localThreshold = threshold / ( ( this.scale.x + this.scale.y + this.scale.z ) / 3 );
		const localThresholdSq = localThreshold * localThreshold;

		if ( geometry.isBufferGeometry ) {

			const index = geometry.index;
			const attributes = geometry.attributes;
			const positionAttribute = attributes.position;
      const morphPosition = geometry.morphAttributes.position;

			if ( index !== null ) {

				const start = Math.max( 0, drawRange.start );
				const end = Math.min( index.count, ( drawRange.start + drawRange.count ) );

				for ( let i = start, il = end; i < il; i ++ ) {

					const a = index.getX( i );
          
          calculatePosition( this, positionAttribute, morphPosition, a );

					testPoint( _position, a, localThresholdSq, matrixWorld, raycaster, intersects, this );

				}

			} else {

				const start = Math.max( 0, drawRange.start );
				const end = Math.min( positionAttribute.count, ( drawRange.start + drawRange.count ) );

				for ( let i = start, l = end; i < l; i ++ ) {
          
          calculatePosition( this, positionAttribute, morphPosition, i );

					testPoint( _position, i, localThresholdSq, matrixWorld, raycaster, intersects, this );

				}

			}

		} else {

			console.error( 'THREE.Points.raycast() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.' );

		}

	}

	updateMorphTargets() {

		const geometry = this.geometry;

		if ( geometry.isBufferGeometry ) {

			const morphAttributes = geometry.morphAttributes;
			const keys = Object.keys( morphAttributes );

			if ( keys.length > 0 ) {

				const morphAttribute = morphAttributes[ keys[ 0 ] ];

				if ( morphAttribute !== undefined ) {

					this.morphTargetInfluences = [];
					this.morphTargetDictionary = {};

					for ( let m = 0, ml = morphAttribute.length; m < ml; m ++ ) {

						const name = morphAttribute[ m ].name || String( m );

						this.morphTargetInfluences.push( 0 );
						this.morphTargetDictionary[ name ] = m;

					}

				}

			}

		} else {

			const morphTargets = geometry.morphTargets;

			if ( morphTargets !== undefined && morphTargets.length > 0 ) {

				console.error( 'THREE.Points.updateMorphTargets() does not support THREE.Geometry. Use THREE.BufferGeometry instead.' );

			}

		}

	}

}

Points.prototype.isPoints = true;

function testPoint( point, index, localThresholdSq, matrixWorld, raycaster, intersects, object ) {

	const rayPointDistanceSq = _ray.distanceSqToPoint( point );

	if ( rayPointDistanceSq < localThresholdSq ) {

		const intersectPoint = new Vector3();

		_ray.closestPointToPoint( point, intersectPoint );
		intersectPoint.applyMatrix4( matrixWorld );

		const distance = raycaster.ray.origin.distanceTo( intersectPoint );

		if ( distance < raycaster.near || distance > raycaster.far ) return;

		intersects.push( {

			distance: distance,
			distanceToRay: Math.sqrt( rayPointDistanceSq ),
			point: intersectPoint,
			index: index,
			face: null,
			object: object

		} );

	}

}

function calculatePosition( object, position, morphPosition, a )	{

  _position.fromBufferAttribute( position, a );

  const morphInfluences = object.morphTargetInfluences;

  if ( object.material.morphTargets && morphPosition && morphInfluences ) {

    _morphA.set( 0, 0, 0 );

    for ( var i = 0, il = morphPosition.length; i < il; i ++ ) {

      const influence = morphInfluences[ i ];
      const morphAttribute = morphPosition[ i ];

      if ( influence === 0 ) continue;

      _tempA.fromBufferAttribute( morphAttribute, a );

      _morphA.addScaledVector( _tempA.sub( _position ), influence );

    }

    _position.add( _morphA );

  }

}

export { Points };