import * as THREE from 'three';
import { Geometry as THREEGeometry } from './three/Geometry';
import SpriteTextModule from 'three-spritetext';
const SpriteText = SpriteTextModule.default || SpriteTextModule;
import discPNG from './assets/disc.png';

function createNewURL(target, reference) {
  const getNewURL = (target, reference) => {
    try {
      let newURL = (new URL(target, reference)).href;
      //Make sure the target url does not contain parameters
      if (target && target.split("?").length < 2) {
        const paramsStrings = reference.split("?");
        //There are parameters, add them to the target
        if (paramsStrings.length === 2) {
          newURL = newURL + "?" + paramsStrings[1];
        }
      }
      return newURL;
    } catch {
      console.error(`There is an issue creating the url link with: ${target}.` );
    }
  }
  if (!Array.isArray(target)) {
    return getNewURL(target, reference);
  } else {
    const urls = [];
    target.forEach((url) => {
      urls.push(getNewURL(url, reference));
    });
    return urls;
  }
}

/*
 * Calculate the bounding box of a mesh, values will be
 * set for cachedBox, b1, v1 and v2 and they need to be
 * defined.
 */
function getBoundingBox(mesh, cachedBox, b1, v1, v2) {
  let influences = mesh.morphTargetInfluences;
  let attributes = undefined;
  if (mesh.geometry)
    attributes = mesh.geometry.morphAttributes;
  let found = false;
  if (influences && attributes && attributes.position) {
    v1.set(0.0, 0.0, 0.0);
    v2.set(0.0, 0.0, 0.0);
    for (let i = 0; i < influences.length; i++) {
      if (influences[i] > 0) {
        found = true;
        b1.setFromArray(attributes.position[i].array);
        v1.add(b1.min.multiplyScalar(influences[i]));
        v2.add(b1.max.multiplyScalar(influences[i]));
      }
    }
    if (found) {
      cachedBox.set(v1, v2);
    }
  }
  if (!found) {
    cachedBox.setFromBufferAttribute(
      mesh.geometry.attributes.position);
  }
  mesh.updateWorldMatrix(true, true);
  cachedBox.applyMatrix4(mesh.matrixWorld);
}


//Convenient function
function loadExternalFile(url, data, callback, errorCallback) {
    // Set up an asynchronous request
  fetch(url)
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
  })
  .then((responseText) => {
    callback(responseText, data);
  })
  .catch((error) => {
    console.error(`Fetch string payload retrieval failed for: ${requestURL}`, error);
    errorCallback(url);
  });
}

function loadExternalFiles(urls, callback, errorCallback) {
    const numUrls = urls.length;
    let numComplete = 0;
    const result = [];

    // Callback for a single file
    function partialCallback(text, urlIndex) {
        result[urlIndex] = text;
        numComplete++;

        // When all files have downloaded
        if (numComplete == numUrls) {
            callback(result);
        }
    }

    for (let i = 0; i < numUrls; i++) {
    	loadExternalFile(urls[i], i, partialCallback, errorCallback);
    }
}


//Get the colours at index
const getColorsRGB = (colors, index) => {
    const index_in_colors = Math.floor(index/3);
    const remainder = index%3;
    let hex_value = 0;
    if (remainder == 0)
    {
        hex_value = colors[index_in_colors].r;
    }
    else if (remainder == 1)
    {
        hex_value = colors[index_in_colors].g;
    }
    else if (remainder == 2)
    {
        hex_value = colors[index_in_colors].b;
    }
    const mycolor = new THREE.Color(hex_value);
    return [mycolor.r, mycolor.g, mycolor.b];
}

const updateMorphColorAttribute = function(targetGeometry, morph) {
  if (morph && targetGeometry && targetGeometry.morphAttributes &&
    targetGeometry.morphAttributes[ "color" ]) {
    const morphColors = targetGeometry.morphAttributes[ "color" ];
    const influences = morph.morphTargetInfluences;
    const length = influences.length;
    targetGeometry.deleteAttribute( 'morphColor0' );
    targetGeometry.deleteAttribute( 'morphColor1' );
    let bound = 0;
    let morphArray = [];
    for (let i = 0; (1 > bound) || (i < length); i++) {
      if (influences[i] > 0) {
        bound++;
        morphArray.push([i, influences[i]]);
      }
    }
    if (morphArray.length == 2) {
      targetGeometry.setAttribute('morphColor0', morphColors[ morphArray[0][0] ] );
      targetGeometry.setAttribute('morphColor1', morphColors[ morphArray[1][0] ] );
    } else if (morphArray.length == 1) {
      targetGeometry.setAttribute('morphColor0', morphColors[ morphArray[0][0] ] );
      targetGeometry.setAttribute('morphColor1', morphColors[ morphArray[0][0] ] );
    }
  }
}


const toBufferGeometry = (geometryIn, options) => {
  let geometry = undefined;
  if (geometryIn instanceof THREEGeometry) {
    if (options.localTimeEnabled && !geometryIn.morphNormalsReady &&
      (geometryIn.morphNormals == undefined || geometryIn.morphNormals.length == 0))
      geometryIn.computeMorphNormals();
    geometry = geometryIn.toIndexedBufferGeometry();
    if (options.localMorphColour) {
      copyMorphColorsToIndexedBufferGeometry(geometryIn, geometry);
    }
  } else if (geometryIn instanceof THREE.BufferGeometry) {
    geometry = geometryIn.clone();
  }
  geometry.colorsNeedUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  if (geometryIn._video)
    geometry._video = geometryIn._video;
  return geometry;
}

const copyMorphColorsToBufferGeometry = (geometry, bufferGeometry) => {
  if (geometry && geometry.morphColors && geometry.morphColors.length > 0 ) {
    let array = [];
    let morphColors = geometry.morphColors;
    for ( var i = 0, l = morphColors.length; i < l; i ++ ) {
      let morphColor = morphColors[ i ];
      let colorArray = [];
      for ( var j = 0; j < geometry.faces.length; j ++ ) {
        let face = geometry.faces[j];
        let color = getColorsRGB(morphColor.colors, face.a);
        colorArray.push(color[0], color[1], color[2]);
        color = getColorsRGB(morphColor.colors, face.b);
        colorArray.push(color[0], color[1], color[2]);
        color = getColorsRGB(morphColor.colors, face.c);
        colorArray.push(color[0], color[1], color[2]);
      }
      var attribute = new THREE.Float32BufferAttribute( geometry.faces.length * 3 * 3, 3 );
      attribute.name = morphColor.name;
      array.push( attribute.copyArray( colorArray ) );
    }
    bufferGeometry.morphAttributes[ "color" ] = array;
  }
}


const copyMorphColorsToIndexedBufferGeometry = (geometry, bufferGeometry) => {
  if (geometry && geometry.morphColors && geometry.morphColors.length > 0 ) {
    let array = [];
    let morphColors = geometry.morphColors;
    for ( let i = 0, l = morphColors.length; i < l; i ++ ) {
      const morphColor = morphColors[ i ];
      const colorArray = [];
      for ( let j = 0; j < morphColor.colors.length * 3; j ++ ) {
        let color = getColorsRGB(morphColor.colors, j);
        colorArray.push(color[0], color[1], color[2]);
      }
      const attribute = new THREE.Float32BufferAttribute( colorArray, 3 );
      attribute.name = morphColor.name;
      array.push( attribute );
    }
    bufferGeometry.morphAttributes[ "color" ] = array;
  }
}

/**
 * Merges a set of attributes into a single instance. All attributes must have compatible properties and types.
 * Instances of {@link InterleavedBufferAttribute} are not supported.
 *
 * @param {Array<BufferAttribute>} attributes - The attributes to merge.
 * @return {?BufferAttribute} The merged attribute. Returns `null` if the merge does not succeed.
 */
function mergeAttributes( attributes ) {

  let TypedArray;
  let itemSize;
  let normalized;
  let gpuType = - 1;
  let arrayLength = 0;

  for ( let i = 0; i < attributes.length; ++ i ) {

    const attribute = attributes[ i ];

    if ( TypedArray === undefined ) TypedArray = attribute.array.constructor;
    if ( TypedArray !== attribute.array.constructor ) {

      console.error( 'THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes.' );
      return null;

    }

    if ( itemSize === undefined ) itemSize = attribute.itemSize;
    if ( itemSize !== attribute.itemSize ) {

      console.error( 'THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes.' );
      return null;

    }

    if ( normalized === undefined ) normalized = attribute.normalized;
    if ( normalized !== attribute.normalized ) {

      console.error( 'THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes.' );
      return null;

    }

    if ( gpuType === - 1 ) gpuType = attribute.gpuType;
    if ( gpuType !== attribute.gpuType ) {

      console.error( 'THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes.' );
      return null;

    }

    arrayLength += attribute.count * itemSize;

  }

  const array = new TypedArray( arrayLength );
  const result = new THREE.BufferAttribute( array, itemSize, normalized );
  let offset = 0;

  for ( let i = 0; i < attributes.length; ++ i ) {

    const attribute = attributes[ i ];
    if ( attribute.isInterleavedBufferAttribute ) {

      const tupleOffset = offset / itemSize;
      for ( let j = 0, l = attribute.count; j < l; j ++ ) {

        for ( let c = 0; c < itemSize; c ++ ) {

          const value = attribute.getComponent( j, c );
          result.setComponent( j + tupleOffset, c, value );

        }

      }

    } else {

      array.set( attribute.array, offset );

    }

    offset += attribute.count * itemSize;

  }

  if ( gpuType !== undefined ) {

    result.gpuType = gpuType;

  }

  return result;

}

/**
 * Merges a set of geometries into a single instance. All geometries must have compatible attributes.
 *
 * @param {Array<BufferGeometry>} geometries - The geometries to merge.
 * @param {boolean} [useGroups=false] - Whether to use groups or not.
 * @return {?BufferGeometry} The merged geometry. Returns `null` if the merge does not succeed.
 */
const mergeGeometries = ( geometries, useGroups = false ) => {

  const isIndexed = geometries[ 0 ].index !== null;

  const attributesUsed = new Set( Object.keys( geometries[ 0 ].attributes ) );
  const morphAttributesUsed = new Set( Object.keys( geometries[ 0 ].morphAttributes ) );

  const attributes = {};
  const morphAttributes = {};

  const morphTargetsRelative = geometries[ 0 ].morphTargetsRelative;

  const mergedGeometry = new THREE.BufferGeometry();

  let offset = 0;

  for ( let i = 0; i < geometries.length; ++ i ) {

    const geometry = geometries[ i ];
    let attributesCount = 0;

    // ensure that all geometries are indexed, or none

    if ( isIndexed !== ( geometry.index !== null ) ) {

      console.error( 'THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index ' + i + '. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.' );
      return null;

    }

    // gather attributes, exit early if they're different

    for ( const name in geometry.attributes ) {

      if ( ! attributesUsed.has( name ) ) {

        console.error( 'THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index ' + i + '. All geometries must have compatible attributes; make sure "' + name + '" attribute exists among all geometries, or in none of them.' );
        return null;

      }

      if ( attributes[ name ] === undefined ) attributes[ name ] = [];

      attributes[ name ].push( geometry.attributes[ name ] );

      attributesCount ++;

    }

    // ensure geometries have the same number of attributes

    if ( attributesCount !== attributesUsed.size ) {

      console.error( 'THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index ' + i + '. Make sure all geometries have the same number of attributes.' );
      return null;

    }

    // gather morph attributes, exit early if they're different

    if ( morphTargetsRelative !== geometry.morphTargetsRelative ) {

      console.error( 'THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index ' + i + '. .morphTargetsRelative must be consistent throughout all geometries.' );
      return null;

    }

    for ( const name in geometry.morphAttributes ) {

      if ( ! morphAttributesUsed.has( name ) ) {

        console.error( 'THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index ' + i + '.  .morphAttributes must be consistent throughout all geometries.' );
        return null;

      }

      if ( morphAttributes[ name ] === undefined ) morphAttributes[ name ] = [];

      morphAttributes[ name ].push( geometry.morphAttributes[ name ] );

    }

    if ( useGroups ) {

      let count;

      if ( isIndexed ) {

        count = geometry.index.count;

      } else if ( geometry.attributes.position !== undefined ) {

        count = geometry.attributes.position.count;

      } else {

        console.error( 'THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index ' + i + '. The geometry must have either an index or a position attribute' );
        return null;

      }

      mergedGeometry.addGroup( offset, count, i );

      offset += count;

    }

  }

  // merge indices

  if ( isIndexed ) {

    let indexOffset = 0;
    const mergedIndex = [];

    for ( let i = 0; i < geometries.length; ++ i ) {

      const index = geometries[ i ].index;

      for ( let j = 0; j < index.count; ++ j ) {

        mergedIndex.push( index.getX( j ) + indexOffset );

      }

      indexOffset += geometries[ i ].attributes.position.count;

    }

    mergedGeometry.setIndex( mergedIndex );

  }

  // merge attributes

  for ( const name in attributes ) {

    const mergedAttribute = mergeAttributes( attributes[ name ] );

    if ( ! mergedAttribute ) {

      console.error( 'THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the ' + name + ' attribute.' );
      return null;

    }

    mergedGeometry.setAttribute( name, mergedAttribute );

  }

  // merge morph attributes

  for ( const name in morphAttributes ) {

    const numMorphTargets = morphAttributes[ name ][ 0 ].length;

    if ( numMorphTargets === 0 ) break;

    mergedGeometry.morphAttributes = mergedGeometry.morphAttributes || {};
    mergedGeometry.morphAttributes[ name ] = [];

    for ( let i = 0; i < numMorphTargets; ++ i ) {

      const morphAttributesToMerge = [];

      for ( let j = 0; j < morphAttributes[ name ].length; ++ j ) {

        morphAttributesToMerge.push( morphAttributes[ name ][ j ][ i ] );

      }

      const mergedMorphAttribute = mergeAttributes( morphAttributesToMerge );

      if ( ! mergedMorphAttribute ) {

        console.error( 'THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the ' + name + ' morphAttribute.' );
        return null;

      }

      mergedGeometry.morphAttributes[ name ].push( mergedMorphAttribute );

    }

  }

  return mergedGeometry;

}

const mergeVertices = ( geometry, tolerance = 1e-4 ) => {

  tolerance = Math.max( tolerance, Number.EPSILON );

  // Generate an index buffer if the geometry doesn't have one, or optimize it
  // if it's already available.
  var hashToIndex = {};
  var indices = geometry.getIndex();
  var positions = geometry.getAttribute( 'position' );
  var vertexCount = indices ? indices.count : positions.count;

  // next value for triangle indices
  var nextIndex = 0;

  // attributes and new attribute arrays
  var attributeNames = Object.keys( geometry.attributes );
  var attrArrays = {};
  var morphAttrsArrays = {};
  var newIndices = [];
  var getters = [ 'getX', 'getY', 'getZ', 'getW' ];

  // initialize the arrays
  for ( var i = 0, l = attributeNames.length; i < l; i ++ ) {
      var name = attributeNames[ i ];

      attrArrays[ name ] = [];

      var morphAttr = geometry.morphAttributes[ name ];
      if ( morphAttr ) {

          morphAttrsArrays[ name ] = new Array( morphAttr.length ).fill().map( () => [] );

      }

  }

  // convert the error tolerance to an amount of decimal places to truncate to
  var decimalShift = Math.log10( 1 / tolerance );
  var shiftMultiplier = Math.pow( 10, decimalShift );
  for ( var i = 0; i < vertexCount; i ++ ) {

      var index = indices ? indices.getX( i ) : i;

      // Generate a hash for the vertex attributes at the current index 'i'
      var hash = '';
      for ( var j = 0, l = attributeNames.length; j < l; j ++ ) {

          var name = attributeNames[ j ];
          var attribute = geometry.getAttribute( name );
          var itemSize = attribute.itemSize;

          for ( var k = 0; k < itemSize; k ++ ) {

              // double tilde truncates the decimal value
              hash += `${ ~ ~ ( attribute[ getters[ k ] ]( index ) * shiftMultiplier ) },`;

          }

      }

      // Add another reference to the vertex if it's already
      // used by another index
      if ( hash in hashToIndex ) {

          newIndices.push( hashToIndex[ hash ] );

      } else {

          // copy data to the new index in the attribute arrays
          for ( var j = 0, l = attributeNames.length; j < l; j ++ ) {

              var name = attributeNames[ j ];
              var attribute = geometry.getAttribute( name );
              var morphAttr = geometry.morphAttributes[ name ];
              var itemSize = attribute.itemSize;
              var newarray = attrArrays[ name ];
              var newMorphArrays = morphAttrsArrays[ name ];

              for ( var k = 0; k < itemSize; k ++ ) {

                  var getterFunc = getters[ k ];
                  newarray.push( attribute[ getterFunc ]( index ) );

                  if ( morphAttr ) {

                      for ( var m = 0, ml = morphAttr.length; m < ml; m ++ ) {

                          newMorphArrays[ m ].push( morphAttr[ m ][ getterFunc ]( index ) );

                      }

                  }

              }

          }

          hashToIndex[ hash ] = nextIndex;
          newIndices.push( nextIndex );
          nextIndex ++;

      }

  }

  // Generate typed arrays from new attribute arrays and update
  // the attributeBuffers
  const result = geometry.clone();
  for ( var i = 0, l = attributeNames.length; i < l; i ++ ) {

      var name = attributeNames[ i ];
      var oldAttribute = geometry.getAttribute( name );
      var attribute;

      var buffer = new oldAttribute.array.constructor( attrArrays[ name ] );
      if ( oldAttribute.isInterleavedBufferAttribute ) {

          attribute = new THREE.BufferAttribute( buffer, oldAttribute.itemSize, oldAttribute.itemSize );

      } else {

          attribute = geometry.getAttribute( name ).clone();
          attribute.setArray( buffer );

      }

      result.setAttribute( name, attribute );

      // Update the attribute arrays
      if ( name in morphAttrsArrays ) {

          for ( var j = 0; j < morphAttrsArrays[ name ].length; j ++ ) {

              var morphAttribute = geometry.morphAttributes[ name ][ j ].clone();
              morphAttribute.setArray( new morphAttribute.array.constructor( morphAttrsArrays[ name ][ j ] ) );
              result.morphAttributes[ name ][ j ] = morphAttribute;

          }

      }

  }

  // Generate an index buffer typed array
  var cons = Uint8Array;
  if ( newIndices.length >= Math.pow( 2, 8 ) ) cons = Uint16Array;
  if ( newIndices.length >= Math.pow( 2, 16 ) ) cons = Uint32Array;

  var newIndexBuffer = new cons( newIndices );
  var newIndices = null;
  if ( indices === null ) {

      newIndices = new THREE.BufferAttribute( newIndexBuffer, 1 );

  } else {

      newIndices = geometry.getIndex().clone();
      newIndices.setArray( newIndexBuffer );

  }

  result.setIndex( newIndices );

  return result;
}

function PhongToToon(materialIn) {
	if (materialIn.isMeshPhongMaterial) {
		let material = new THREE.MeshToonMaterial({
			color : materialIn.color.clone(),
			vertexColors : materialIn.vertexColors,
			transparent : materialIn.transparent,
			opacity : materialIn.opacity,
			side : materialIn.side
		});
		if (materialIn.map)
			material.map = materialIn.map;
		return material;
	}

	return materialIn;
}

/**
 * Create and return a new buffer geometry with the size of length,
 * and initial coords.
 */
function createBufferGeometry(length, coords) {
  if (coords && (length >= coords.length)) {
    const geometry = new THREE.BufferGeometry()
    const vertices = new Float32Array(length * 3);
    let i = 0;
    coords.forEach(coord => {
      vertices[i++] = coord[0];
      vertices[i++] = coord[1];
      vertices[i++] = coord[2];
    });
    geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
    geometry.setDrawRange(0, coords.length);
    return geometry;
  }
  return undefined;
};

function getCircularTexture() {
  const image = new Image();
  image.src = discPNG;
  const texture = new THREE.Texture();
  texture.image = image;
  texture.needsUpdate = true;
  return texture;
}

function createNewSpriteText(text, height, colour, font, pixel, weight) {
  const sprite = new SpriteText(text, height, colour, font, pixel, weight);
  sprite.canvasScale = 4;
  sprite.fontFace = font;
  sprite.fontSize = pixel;
  sprite.fontWeight = weight;
  sprite.material.map.generateMipmaps = true;
  sprite.material.map.anisotropy = 4;
  sprite.material.sizeAttenuation = false;
  sprite.material.alphaTest = 0.5;
  sprite.material.transparent = true;
  sprite.material.depthWrite = false;
  sprite.material.depthTest = false;
  sprite.center.set(0.5, -1.2);
  sprite.renderOrder = 10001;
  return sprite;
}

/*
 * Check if the compare path match with the region or/and group.
 * comparePath should be in the form of regionPath/Group.
 * * can be used as wildcard.
 * comparePath will be used to compare both region and group if it
 * is a single string without /
 */
function isRegionGroup(regionPath, groupName, comparePath) {
  if (comparePath) {
    const region = regionPath ? regionPath : "";
    const group = groupName ? groupName : "";
    const n = comparePath.lastIndexOf('/');
    if (n > -1) {
      let r = undefined;
      let g = undefined;
      r = comparePath.substring(0, n);
      g = comparePath.substring(n + 1);
      if (r === "*" || r === "**" || r.toLowerCase() === region.toLowerCase()) {
        if (g === "*" || g === "**" || g.toLowerCase() === group.toLowerCase()) {
          return true;
        }
      }
    } else {
      //one single value if one of the region / group matches
      if (region.toLowerCase() === comparePath.toLowerCase() ||
        group.toLowerCase() === comparePath.toLowerCase()) {
        return true;
      }
    }
  }

  return false;
}

function removeVertexAtIndex(geometry, index, maintainLength) {
  const positionAttribute = geometry.getAttribute('position');
  const normalAttribute = geometry.getAttribute('normal'); // Also update other attributes

  if (!positionAttribute) return;

  const itemSize = positionAttribute.itemSize; // e.g., 3 for x, y, z
  const start = index * itemSize;
  const deleteCount = itemSize;
  let removed = false;

  // Helper to remove elements from a typed array
  const removeElements = (attribute, name) => {
    let removed = false;
    const array = Array.from(attribute.array);
    if (array.length >= (start + deleteCount)) {
      array.splice(start, deleteCount); // Use splice for removal
      if (maintainLength) {
        array.concat(new Array(deleteCount).fill(0));
      }
      removed = true;
      const newArray = new Float32Array(array);
      geometry.setAttribute(name, new THREE.BufferAttribute(newArray, itemSize));
      geometry.getAttribute(name).needsUpdate = true;
    }
    // Create new BufferAttribute with the modified array

    return removed;
  };

  removed = removeElements(positionAttribute, 'position');
  if (normalAttribute) removeElements(normalAttribute, 'normal');
  // Repeat for 'uv', 'color', etc.

  // If the geometry is indexed, the index buffer will also need adjustment
  if (geometry.index !== null) {
      // This is more complex, typically easier to work with non-indexed geometry when modifying vertices
      console.warn("Removing vertices from indexed geometry requires index buffer recalculation.");
  }

  return removed;
}

function copyVector2sArray(attribute, vectors) {
  const array = attribute.array;
  let offset = 0;

  for (let i = 0; i < vectors.length; i++) {
    const v = vectors[i];
    array[offset++] = v.x;
    array[offset++] = v.y;
  }

  attribute.needsUpdate = true;
  return attribute;
}

function copyVector3sArray(attribute, vectors) {
  const array = attribute.array;
  let offset = 0;

  for (let i = 0; i < vectors.length; i++) {
    const v = vectors[i];
    array[offset++] = v.x;
    array[offset++] = v.y;
    array[offset++] = v.z;
  }

  attribute.needsUpdate = true;
  return attribute;
}

function copyVector4sArray(attribute, vectors) {
  const array = attribute.array;
  let offset = 0;

  for (let i = 0; i < vectors.length; i++) {
    const v = vectors[i];
    array[offset++] = v.x;
    array[offset++] = v.y;
    array[offset++] = v.z;
    array[offset++] = v.w;
  }

  attribute.needsUpdate = true;
  return attribute;
}

function copyColorsArray(attribute, colors) {
  const array = attribute.array;
  let offset = 0;

  for (let i = 0; i < colors.length; i++) {
    const c = colors[i];
    array[offset++] = c.r;
    array[offset++] = c.g;
    array[offset++] = c.b;
  }

  attribute.needsUpdate = true;
  return attribute;
}

export {
  copyMorphColorsToBufferGeometry,
  copyColorsArray,
  copyVector2sArray,
  copyVector3sArray,
  copyVector4sArray,
  createBufferGeometry,
  createNewSpriteText,
  createNewURL,
  getBoundingBox,
  getCircularTexture,
  getColorsRGB,
  isRegionGroup,
  loadExternalFile,
  loadExternalFiles,
  mergeGeometries,
  mergeVertices,
  PhongToToon,
  removeVertexAtIndex,
  updateMorphColorAttribute,
  toBufferGeometry,
 };

