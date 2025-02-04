const THREE = require('three');
const THREEGeometry = require('./three/Geometry').Geometry;
const SpriteText = require('three-spritetext').default;

function resolveURL(url) {
	let actualURL = url;
	const prefix = (require("./zinc").modelPrefix);
	
	if (prefix) {
		if (prefix[prefix.length -1] != '/')
			prefix = prefix + '/';
		const r = new RegExp('^(?:[a-z]+:)?//', 'i');
		if (!r.test(url)) {
			actualURL =  prefix + url;
		}
	}
	
	return actualURL;
}

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
    const request = new XMLHttpRequest();
    request.open('GET', resolveURL(url), true);

    // Hook the event that gets called as the request progresses
    request.onreadystatechange = () => {
        // If the request is "DONE" (completed or failed)
        if (request.readyState == 4) {
            // If we got HTTP status 200 (OK)
            if (request.status == 200) {
                callback(request.responseText, data)
            } else { // Failed
                errorCallback(url);
            }
        }
    };

    request.send(null);    
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
exports.getColorsRGB = (colors, index) => {
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

exports.updateMorphColorAttribute = function(targetGeometry, morph) {
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


exports.toBufferGeometry = (geometryIn, options) => {
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

exports.copyMorphColorsToBufferGeometry = (geometry, bufferGeometry) => {
  if (geometry && geometry.morphColors && geometry.morphColors.length > 0 ) {
    let array = [];
    let morphColors = geometry.morphColors;
    const getColorsRGB = require("./utilities").getColorsRGB;
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
    const getColorsRGB = require("./utilities").getColorsRGB;
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

exports.mergeVertices = ( geometry, tolerance = 1e-4 ) => {

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
			morphTargets : materialIn.morphTargets,
			morphNormals : materialIn.morphNormals,
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
  image.src = require("./assets/disc.png");
  const texture = new THREE.Texture();
  texture.image = image;
  texture.needsUpdate = true;
  return texture;
}

function createNewSpriteText(text, height, colour, font, pixel, weight) {
  const sprite = new SpriteText(text, height, colour, font, pixel, weight);
  sprite.fontFace = font;
  sprite.fontSize = pixel;
  sprite.fontWeight = weight;
  sprite.material.map.generateMipmaps = false;
  sprite.material.map.anisotropy = 4;
  sprite.material.sizeAttenuation = false;
  sprite.material.alphaTest = 0.5;
  sprite.material.transparent = true;
  sprite.material.depthWrite = false;
  sprite.material.depthTest = false;
  sprite.center.set(0.5, -1.2);
  sprite.renderOrder = 10000;
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

exports.getBoundingBox = getBoundingBox;
exports.createNewURL = createNewURL;
exports.createBufferGeometry = createBufferGeometry;
exports.getCircularTexture = getCircularTexture;
exports.resolveURL = resolveURL;
exports.loadExternalFile = loadExternalFile;
exports.loadExternalFiles = loadExternalFiles;
exports.PhongToToon = PhongToToon;
exports.createNewSpriteText = createNewSpriteText;
exports.isRegionGroup = isRegionGroup;
