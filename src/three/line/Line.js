import {
  BufferGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
	Matrix4,
  Object3D,
  Ray,
	Sphere,
	Vector3
} from 'three';


const _start = /*@__PURE__*/ new Vector3();
const _end = /*@__PURE__*/ new Vector3();
const _inverseMatrix = /*@__PURE__*/ new Matrix4();
const _ray = /*@__PURE__*/ new Ray();
const _sphere = /*@__PURE__*/ new Sphere();
const _morphA = /*@__PURE__*/ new Vector3();
const _morphB = /*@__PURE__*/ new Vector3();
const _tempA = /*@__PURE__*/ new Vector3();
const _tempB = /*@__PURE__*/ new Vector3();

class Line extends Object3D {

	constructor( geometry = new BufferGeometry(), material = new LineBasicMaterial() ) {

		super();

		this.type = 'Line';

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

	computeLineDistances() {

		const geometry = this.geometry;

		if ( geometry.isBufferGeometry ) {

			// we assume non-indexed geometry

			if ( geometry.index === null ) {

				const positionAttribute = geometry.attributes.position;
				const lineDistances = [ 0 ];

				for ( let i = 1, l = positionAttribute.count; i < l; i ++ ) {

					_start.fromBufferAttribute( positionAttribute, i - 1 );
					_end.fromBufferAttribute( positionAttribute, i );

					lineDistances[ i ] = lineDistances[ i - 1 ];
					lineDistances[ i ] += _start.distanceTo( _end );

				}

				geometry.setAttribute( 'lineDistance', new Float32BufferAttribute( lineDistances, 1 ) );

			} else {

				console.warn( 'THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.' );

			}

		} else if ( geometry.isGeometry ) {

			console.error( 'THREE.Line.computeLineDistances() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.' );

		}

		return this;

	}

	raycast( raycaster, intersects ) {

		const geometry = this.geometry;
		const matrixWorld = this.matrixWorld;
		const threshold = raycaster.params.Line.threshold;
    const drawRange = geometry.drawRange;
    const morphPosition = geometry.morphAttributes.position;

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

		const vStart = new Vector3();
		const vEnd = new Vector3();
		const interSegment = new Vector3();
		const interRay = new Vector3();
		const step = this.isLineSegments ? 2 : 1;

		if ( geometry.isBufferGeometry ) {

			const index = geometry.index;
			const attributes = geometry.attributes;
			const positionAttribute = attributes.position;

			if ( index !== null ) {

				const start = Math.max( 0, drawRange.start );
				const end = Math.min( index.count, ( drawRange.start + drawRange.count ) );

				for ( let i = start, l = end - 1; i < l; i += step ) {

					const a = index.getX( i );
          const b = index.getX( i + 1 );
          
          calculatePosition( vStart, vEnd, this, positionAttribute, morphPosition, a, b );

					const distSq = _ray.distanceSqToSegment( vStart, vEnd, interRay, interSegment );

					if ( distSq > localThresholdSq ) continue;

					interRay.applyMatrix4( this.matrixWorld ); //Move back to world space for distance calculation

					const distance = raycaster.ray.origin.distanceTo( interRay );

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

				const start = Math.max( 0, drawRange.start );
				const end = Math.min( positionAttribute.count, ( drawRange.start + drawRange.count ) );

				for ( let i = start, l = end - 1; i < l; i += step ) {

          calculatePosition( vStart, vEnd, this, positionAttribute, morphPosition, i, i+1 );

					const distSq = _ray.distanceSqToSegment( vStart, vEnd, interRay, interSegment );

					if ( distSq > localThresholdSq ) continue;

					interRay.applyMatrix4( this.matrixWorld ); //Move back to world space for distance calculation

					const distance = raycaster.ray.origin.distanceTo( interRay );

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

			console.error( 'THREE.Line.raycast() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.' );

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

				console.error( 'THREE.Line.updateMorphTargets() does not support THREE.Geometry. Use THREE.BufferGeometry instead.' );

			}

		}

	}

}

function calculatePosition( vStart, vEnd, object, position, morphPosition, a, b )	{

  vStart.fromBufferAttribute( position, a );
  vEnd.fromBufferAttribute( position, b );

  var morphInfluences = object.morphTargetInfluences;

  if ( object.material.morphTargets && morphPosition && morphInfluences ) {

    _morphA.set( 0, 0, 0 );
    _morphB.set( 0, 0, 0 );

    for ( var i = 0, il = morphPosition.length; i < il; i ++ ) {

      var influence = morphInfluences[ i ];
      var morphAttribute = morphPosition[ i ];

      if ( influence === 0 ) continue;

      _tempA.fromBufferAttribute( morphAttribute, a );
      _tempB.fromBufferAttribute( morphAttribute, b );

      _morphA.addScaledVector( _tempA.sub( vStart ), influence );
      _morphB.addScaledVector( _tempB.sub( vEnd ), influence );

    }

    vStart.add( _morphA );
    vEnd.add( _morphB );

  }

}

Line.prototype.isLine = true;


export { Line };