import {
  InstancedMesh,
  Matrix4,
  Ray,
  Vector3,
} from 'three/webgpu';

const _inverseMatrix = /*@__PURE__*/ new Matrix4();
const _ray = /*@__PURE__*/ new Ray();
const _position = /*@__PURE__*/ new Vector3();

/**
 * An {@link THREE.InstancedMesh} used to draw a {@link Pointset}. Every
 * instance is a small quad billboarded towards the camera on the GPU (see
 * {@link createInstancedPointsMaterial}), so the usual matrix/geometry based
 * raycasting and bounding logic performed by `THREE.InstancedMesh` does not
 * apply - the true, already time-blended location of every point is instead
 * kept in `pointPositions` (local space) and used here directly, mirroring
 * the distance-to-point approach the legacy `THREE.Points` override used.
 */
class InstancedPoints extends InstancedMesh {

  constructor(geometry, material, count) {
    super(geometry, material, count);
    this.type = 'InstancedPoints';
    this.isInstancedPoints = true;
    this.frustumCulled = false;
    this.pointSize = 10;
    this.sizePerPixel = 1;
    //Flat [x0, y0, z0, x1, y1, z1, ...] array of the current, already
    //time-blended local positions of every active point.
    this.pointPositions = new Float32Array(0);
  }

  raycast(raycaster, intersects) {
    const matrixWorld = this.matrixWorld;
    const threshold = raycaster.params.Points ? raycaster.params.Points.threshold : 1;
    const count = this.count;
    const positions = this.pointPositions;

    if (!count || !positions || positions.length < count * 3) return;

    _inverseMatrix.copy(matrixWorld).invert();
    _ray.copy(raycaster.ray).applyMatrix4(_inverseMatrix);

    const averageScale = (this.scale.x + this.scale.y + this.scale.z) / 3;
    const localThreshold = threshold / averageScale * this.pointSize * this.sizePerPixel;
    const localThresholdSq = localThreshold * localThreshold;

    for (let i = 0; i < count; i++) {
      _position.fromArray(positions, i * 3);
      const rayPointDistanceSq = _ray.distanceSqToPoint(_position);
      if (rayPointDistanceSq < localThresholdSq) {
        const intersectPoint = new Vector3();
        _ray.closestPointToPoint(_position, intersectPoint);
        intersectPoint.applyMatrix4(matrixWorld);
        const distance = raycaster.ray.origin.distanceTo(intersectPoint);
        if (distance < raycaster.near || distance > raycaster.far) continue;
        intersects.push({
          distance: distance,
          distanceToRay: Math.sqrt(rayPointDistanceSq),
          point: intersectPoint,
          index: i,
          face: null,
          object: this,
        });
      }
    }
  }

}

export { InstancedPoints };
