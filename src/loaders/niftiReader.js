import * as nifti from 'nifti-reader-js';
import * as THREE from 'three';
import { TextureArray } from '../texture/textureArray';
import { TextureSlides } from '../primitives/textureSlides';

const defaultTextureSettings = {
  "id": "mesh-location-orientation",
  "locations": [
    {
      "identifier": 1,
      "label": "original",
      "orientation": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0],
      "position": [0, 0, 0],
      "scale": [1, 1, 1],
      "flipY": false,
      "flipZ": false,
      "reference_point": "corner"
    }
  ],
  "settings": {
    "slides": [
      {
        "direction": "x",
        "value": 0.5
      },
      {
        "direction": "y",
        "value": 0.5
      },
      {
        "direction": "z",
        "value": 0.5
      }
    ]
  },
  "type": "slides"
};

const defaultOptions = {
  hideBlackPixel: true,
  keepScalePosition: true,
  filterByValue: true,
  timeEnabled: false,
};


/*
const exampleSettings = {
  v1: {
    "id": "mesh-location-orientation",
    "locations": [
      {
        "identifier": 1,
        "label": "original",
        "orientation": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0],
        "position": [-283, -363, 1090],
        "scale": [540, 540, 276],
        "flipY": false,
        "reference_point": "corner"
      }
    ],
    "settings": {
      "slides": [
        {
          "direction": "x",
          "value": 0.5
        },
        {
          "direction": "y",
          "value": 0.5
        },
        {
          "direction": "z",
          "value": 0.45
        }
      ]
    },
    "type": "slides"
  },
  v2: {
    "id": "mesh-location-orientation",
    "locations": [
      {
        "identifier": 1,
        "label": "original",
        "orientation": [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0],
        "position": [-183, -343, 1034],
        "scale": [520, 520, 235],
        "flipY": false,
        "reference_point": "corner"
      }
    ],
    "settings": {
      "slides": [
        {NIFTI
          "direction": "x",
          "value": 0.5
        },
        {
          "direction": "y",
          "value": 0.5
        },
        {
          "direction": "z",
          "value": 0.45
        }
      ]
    },
    "type": "slides"
  }
}
*/

function readNIFTI(data) {
  // parse nifti
  let fullData = nifti.isCompressed(data) ? nifti.decompress(data) : data;
  if (nifti.isNIFTI(fullData)) {
    let niftiHeader = nifti.readHeader(fullData);
    let niftiImage = nifti.readImage(niftiHeader, fullData);
    return {niftiHeader, niftiImage};
  }
  fullData = undefined;
  return {niftiHeader: undefined, niftiImage: undefined};
}


function convertNiftiToUint8Array(niftiHeader, niftiImage) {
  // 1. Parse the raw array using the correct native typed array view
  let rawData;
  switch (niftiHeader.datatypeCode) {
    case nifti.NIFTI1.TYPE_UINT8:   rawData = new Uint8Array(niftiImage); break;
    case nifti.NIFTI1.TYPE_INT8:    rawData = new Int8Array(niftiImage); break;
    case nifti.NIFTI1.TYPE_UINT16:  rawData = new Uint16Array(niftiImage); break;
    case nifti.NIFTI1.TYPE_INT16:   rawData = new Int16Array(niftiImage); break;
    case nifti.NIFTI1.TYPE_UINT32:  rawData = new Uint32Array(niftiImage); break;
    case nifti.NIFTI1.TYPE_INT32:   rawData = new Int32Array(niftiImage); break;
    case nifti.NIFTI1.TYPE_FLOAT32: rawData = new Float32Array(niftiImage); break;
    case nifti.NIFTI1.TYPE_FLOAT64: rawData = new Float64Array(niftiImage); break;
    default: throw new Error("Unsupported NIfTI data type");
  }

  let min = Infinity;
  let max = -Infinity;

  const len = rawData.length;
  for (let i = 0; i < len; i++) {
    let val = rawData[i];
    if (val < min) min = val;
    if (val > max) max = val;
  }

  const uint8Data = new Uint8Array(len);
  const range = max - min;

  for (let i = 0; i < len; i++) {
    let physicalVal = rawData[i];
    let normalised = (physicalVal - min) / range;
    normalised = Math.max(0.0, Math.min(1.0, normalised));
    uint8Data[i] = Math.round(normalised * 255.0);
  }

  return uint8Data;
}

function createSources(niftiHeader, niftiImage, maskHeader, maskImage) {
  if (niftiHeader?.dims && niftiHeader.dims[0] === 3) {
    const width = niftiHeader.dims[1];
    const height = niftiHeader.dims[2];
    const depth = niftiHeader.dims[3];
    let isRGB = false;
    if (niftiHeader.intent_code === 1007 || niftiHeader.intent_code === 1008 ||
      niftiHeader.datatypeCode === 128 || niftiHeader.datatypeCode === 2304) {
      isRGB = true;
    }
    const typedData = convertNiftiToUint8Array(niftiHeader, niftiImage);
    let maskData = undefined;
    if (maskHeader && maskImage) {
      const maskWidth = maskHeader.dims[1];
      const maskHeight = maskHeader.dims[2];
      const maskDepth = maskHeader.dims[3];
      if (maskWidth === width && maskHeight === height && maskDepth === depth) {
        const maskedTypedData = convertNiftiToUint8Array(maskHeader, maskImage);
        maskData = maskedTypedData;
      }
    }

    return {
      data: typedData,
      maskData: maskData,
      width,
      height,
      depth,
      isRGB,
    };
  }
  return undefined;
}

function getSFormTransformation(header, options) {
  if (header?.affine && header.dims) {
    const affine = header.affine;
    const position = [0, 0, 0];
    const scale = [0, 0, 0];
    position[0] = affine[0][3];
    position[1] = affine[1][3];
    position[2] = affine[2][3];
    scale[0] = affine[0][0] * header.dims[1];
    scale[1] = affine[1][1] * header.dims[2];
    scale[2] = affine[2][2] * header.dims[3];
    if (options.keepScalePosition) {
      scale[0] = Math.abs(scale[0]);
      scale[1] = Math.abs(scale[1]);
      scale[2] = Math.abs(scale[2]);
    }
    return {position, scale}
  }
  return {position: undefined, scale: undefined}
}

function getTransformationFromHeader(header, options) {
  if (header) {
    if (header.sform_code) {
      return getSFormTransformation(header, options)
    }
  }

  return {position: undefined, scale: undefined}
}

function createDataTexture(data, width, height, depth, isRGB) {
  const dataTexture = new THREE.DataArrayTexture(
    data, width, height, depth);
  dataTexture.anisotropy = 4;
  if (!isRGB) {
    dataTexture.format = THREE.RedFormat;
  }
  dataTexture.minFilter = THREE.NearestFilter;
  dataTexture.magFilter = THREE.NearestFilter;
  dataTexture.needsUpdate = true;
  return dataTexture;
}

function createTextureArray(sources) {
  if (sources?.data) {
    const tArray = new TextureArray();
    tArray.impl = new createDataTexture(
      sources.data, sources.width, sources.height, sources.depth);
    tArray.size = {
      width: sources.width,
      height: sources.height,
      depth: sources.depth,
    };
    tArray.isLoading = false;
    return tArray;
  }
  return undefined;
}

function createTexturePrimitives(niftiHeader, sources, useHeaderInfo, textureSettings, optionsIn) {
  if (sources?.data) {
    const options = {...defaultOptions};
    if (optionsIn) {
      Object.assign(options, optionsIn);
    }
    const newTexture = new TextureSlides();
    const tArray = createTextureArray(sources);
    if (tArray) {
      newTexture.groupName = "Images";
      newTexture.morph.renderOrder = 1;
      newTexture.texture = tArray;
      const settings = structuredClone(defaultTextureSettings);
      Object.assign(settings, textureSettings);
      //The following will allow the dimension and upset to be
      //set using the information from the header
      if (useHeaderInfo && niftiHeader) {
        const {position, scale} = getTransformationFromHeader(niftiHeader, options);
        if (position && scale) {
          settings.locations[0].scale = scale;
          settings.locations[0].position = position;
        }
      }
      newTexture.initialise(settings, undefined);
      newTexture.showEdges(0x999999);
      if (sources.maskData && !options.timeEnabled) {
        const maskTexture = createDataTexture(sources.maskData,
          sources.width, sources.height, sources.depth, false);
        newTexture.setMask(maskTexture);
      }
      newTexture.setNumberOfChannels(sources.isRGB ? 3 : 1);

      return newTexture;
    }
  }
  return undefined;
}

async function getImagesFromURL(url, maskURL) {

  //  try {
  let maskHeader = undefined, maskImage = undefined;
  if (maskURL) {
    const mask = await fetch(maskURL);
    const maskBuffer = await mask.arrayBuffer();
    const maskedNIFTI = readNIFTI(maskBuffer);
    maskHeader = maskedNIFTI.niftiHeader;
    maskImage = maskedNIFTI.niftiImage;
  }
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const {niftiHeader, niftiImage} = readNIFTI(buffer);
  const sources = createSources(niftiHeader, niftiImage, maskHeader, maskImage);
  return {sources, niftiHeader};
}


async function createPrimitivesFromNIFTI(
  url, useHeaderInfo, maskURL, textureSettings, optionsIn) {
  let timeEnabled = false;
  let textureP = undefined;
  let firstURL = url;
  if (Array.isArray(url)) {
    firstURL = url[0];
    if (url.length > 1 && optionsIn?.timeEnabled) {
      timeEnabled = true;
    }
  }
  if (typeof firstURL === 'string') {
    const {sources, niftiHeader} = await getImagesFromURL(firstURL, maskURL, optionsIn);
    textureP = createTexturePrimitives(niftiHeader, sources, useHeaderInfo, textureSettings, optionsIn);
  }
  if (timeEnabled && textureP) {
    for (let i = 1; i < url.length; i++) {
      const tArray = await createTextureFromNIFTI(url[i], maskURL, optionsIn);
      textureP.addTextureArray(tArray);
    }
    textureP.timeEnabled = true;
  }

  return textureP;
}

async function createTextureFromNIFTI(url, maskURL, optionsIn) {
  const {sources} = await getImagesFromURL(url, maskURL, optionsIn);
  return createTextureArray(sources);
}

export { createPrimitivesFromNIFTI, createTextureFromNIFTI };
