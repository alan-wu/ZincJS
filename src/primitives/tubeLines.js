import * as THREE from 'three';
import { mergeGeometries } from '../utilities';
import { ZincObject } from './zincObject';

/**
 * Provides an object which stores lines.
 * This is created when a valid json file containing lines is read into a {@link Zinc.Scene}
 * object.
 *
 * @class
 * @author Alan Wu
 * @return {TubeLines}
 */
const TubeLines = function () {
    ZincObject.call(this);
    this.isTubeLines = true;
    let dataIn = {};
    let geometryConfig = { radius: 1, radialSegments: 8, smooth: false };

    /**
     * Create the line segements using geometry and material.
     *
     * @param {THREE.Geomtry} geometryIn - Geometry of lines to be rendered.
     * @param {THREE.Material} materialIn - Material to be set for the lines.
     * @param {Object} options - Provide various options
     * @param {Boolean} options.localTimeEnabled - A flag to indicate either the lines is
     * time dependent.
     * @param {Boolean} options.localMorphColour - A flag to indicate either the colour is
     * time dependent.
     */
    this.createLineSegment = (geometryIn, materialIn, options) => {
        if (geometryIn && materialIn) {
            dataIn = { geometryIn, materialIn, options };
            const geometry = getTubeLinesGeometry(geometryIn.vertices);
            const material = new THREE.MeshStandardMaterial({ color: materialIn.color });
            const mesh = new THREE.Mesh(geometry, material);
            this.setMesh(mesh, options.localTimeEnabled, options.localMorphColour);
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
     * Set the opacity of this Geometry. This function will also set the transparent
     * according to the provided alpha value.
     *
     * @param {Number} alpah - Alpha value to set for this geometry,
     * can be any value between from 0 to 1.0.
     */
    this.setAlpha = function (alpha) {
        let mesh = this.getMorph();
        mesh.material.opacity = alpha;
        mesh.material.transparent = alpha < 1.0;
        mesh.material.depthWrite = alpha > 0.5;
    }

    /**
     * Set the wireframe mode for this geometry.
     * @param {Boolean} wireframe
     */
    this.setWireframe = (wireframe) => {
        let mesh = this.getMorph();
        mesh.material.wireframe = wireframe;
    }

    /**
     * Update tube radius/radialSegments value
     *
     * @param {Float} radius The radius of the tube.
     * @param {Integer} radialSegments The number of segments that make up the cross-section.
     */
    this.setTubeLines = (radius, radialSegments) => {
        if (radius && radialSegments) {
            const { geometryIn } = dataIn;
            let mesh = this.getMorph();
            mesh.geometry.dispose();

            geometryConfig = Object.assign(geometryConfig, { radius, radialSegments });
            mesh.geometry = getTubeLinesGeometry(geometryIn.vertices);
        }
    }

    /**
     * Get merged geometry from list of geometry vertices
     *
     * @param {Array} vertices - An array of THREE.Vector3 vertices.
     * @returns {Object}
     */
    const getTubeLinesGeometry = (vertices) => {
        const { radius, radialSegments, smooth } = geometryConfig;
        let finalGeometry;
        if (smooth) {
            const curve = new THREE.CatmullRomCurve3(vertices);
            finalGeometry = new THREE.TubeGeometry(curve, vertices.length, radius, radialSegments, false);
        } else {
            const geometries = [];
            for (let i = 0; i + 1 < vertices.length; i = i + 2) {
                const curve = new THREE.LineCurve3(vertices[i], vertices[i+1]);
                const tubeGeometry = new THREE.TubeGeometry(curve, 1, radius, radialSegments, false);
                geometries.push(tubeGeometry);
            }
            finalGeometry = mergeGeometries(geometries, true);
            geometries.forEach(g => g.dispose());
        }
        return finalGeometry;
    }
}

TubeLines.prototype = Object.create(ZincObject.prototype);
export { TubeLines };
