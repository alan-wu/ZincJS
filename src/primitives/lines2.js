import * as THREE from 'three/webgpu';
import { Lines } from './lines';
import { LineSegments2 } from '../three/line/LineSegments2';
//import { LineMaterial } from '../three/line/LineMaterial';
import { LineSegmentsGeometry } from '../three/line/LineSegmentsGeometry';

/**
 * Provides an object which stores lines.
 * This is created when a valid json file containing lines is read into a {@link Zinc.Scene}
 * object.
 *
 * @class
 * @author Alan Wu
 * @return {Lines}
 */
const Lines2 = function () {
  Lines.call(this);
	this.isLines2 = true;
  let positions = new Array(300);

  /**
   * Create the line segements using geometry and material.
   *
   * @param {Array} arrayIn - Geometry of lines to be rendered.
   * @param {THREE.Material} materialIn - Material to be set for the lines.
   * @param {Object} options - Provide various options
   * @param {Boolean} options.localTimeEnabled - A flag to indicate either the lines is
   * time dependent.
   * @param {Boolean} options.localMorphColour - A flag to indicate either the colour is
   * time dependent.
   */
	this.createLineSegment = (arrayIn, materialIn, options) => {
		if (arrayIn && materialIn) {
      const linesGeometry = new LineSegmentsGeometry();
      linesGeometry.setPositions(arrayIn);
      linesGeometry.colorsNeedUpdate = true;
      const line = new LineSegments2(linesGeometry, materialIn);
      line.scale.set(1, 1, 1);
      line.computeLineDistances();
      this.setMesh(line, options.localTimeEnabled, options.localMorphColour);
		}
	}

  /**
   * Set the width for the lines.
   *
   * @param {Number} width - Width of the lines.
   */
	this.setWidth = width => {
		if (this.morph && this.morph.material) {
			this.morph.material.linewidth = width;
			this.morph.material.needsUpdate = true;
		}
	}

  /**
   * Add new vertices into the array
   */
  this.addVertices = function(coords) {
    if (coords && coords.length) {
      let mesh = this.getMorph();
      if (!mesh) {
        this.drawRange = 0;
      }
      let index = this.drawRange * 3;
      coords.forEach(coord => {
        positions[index++] = coord[0];
        positions[index++] = coord[1];
        positions[index++] = coord[2];
        this.drawRange++;
      });
      //fill the rest of the array.
      if (!mesh) {
        while (index < 300) {
          positions[index++] = coords[0][0];
          positions[index++] = coords[0][1];
          positions[index++] = coords[0][2];
        }
      }

      if (mesh) {
        mesh.geometry.setPositions(positions);
        mesh.computeLineDistances();
        mesh.geometry.computeBoundingBox();
        mesh.geometry.computeBoundingSphere();
        this.boundingBoxUpdateRequired = true;
      }
    }
    return positions;
  }

  /**
   * Get the vertices by face index
   */
  this.getVerticesByFaceIndex = function(faceIndex) {
    let vIndex = faceIndex * 2 * 3;
    const mesh = this.getMorph();
    if (mesh && (this.drawRange * 3) > vIndex) {
      const position = mesh.geometry.getAttribute( 'instanceStart' );
      return [
        [
          position.data.array[vIndex],
          position.data.array[++vIndex],
          position.data.array[++vIndex],
        ],
        [
          position.data.array[++vIndex],
          position.data.array[++vIndex],
          position.data.array[++vIndex],
        ],
      ];
    }
    return [];
  }

  /**
   * Edit Vertice in index.
   */
  this.editVertices = function(coords, i) {
    if (coords && coords.length) {
      let mesh = this.getMorph();
      const maxIndex = i + coords.length - 1;
      if (!mesh || 0 > i || maxIndex >= this.drawRange) {
        return;
      } else {

        let index = i * 3;
        coords.forEach(coord => {
          positions[index++] = coord[0];
          positions[index++] = coord[1];
          positions[index++] = coord[2];
        });
        index = this.drawRange * 3;
        while (index < 300) {
          positions[index++] = coords[0][0];
          positions[index++] = coords[0][1];
          positions[index++] = coords[0][2];
        }
        mesh.geometry.setPositions(positions);
        mesh.computeLineDistances();
        mesh.geometry.computeBoundingBox();
        mesh.geometry.computeBoundingSphere();
        this.boundingBoxUpdateRequired = true;
      }
    }
    return positions;
  }

  /**
   * Add new lines to existing lines if it exists, otherwise
   * create a new one and add to it.
   * @param {Array} coords  -An array of three components coordinates.

   * @param {Number} colour - A hex value of the colour for the points
   */
	this.addLines = (coords, colour)  => {
    if (coords && coords.length > 0) {
      this.addVertices(coords);
      let mesh = this.getMorph();
      if (!mesh) {
        const material = new THREE.Line2NodeMaterial( {
          color: colour,
          linewidth:1,
          vertexColors: false,
          worldUnits: false,
        });
        const options = { localTimeEnabled: false, localMorphColour: false};
        this.createLineSegment(positions, material, options);
      }
      if (this.region) this.region.pickableUpdateRequired = true;
    }
	}

}

Lines2.prototype = Object.create(Lines.prototype);
Lines2.prototype.constructor = Lines2;
export { Lines2 };
