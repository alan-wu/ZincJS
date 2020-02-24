const THREE = require('three');
const resolveURL = require('./utilities').resolveURL;
const JSONLoader = require('./loader').JSONLoader;
const STLLoader = require('./STLLoader').STLLoader;
const OBJLoader = require('./OBJLoader').OBJLoader;

exports.SceneLoader = function (sceneIn) {
  const scene = sceneIn;
  this.num_inputs = 0;
  let startingId = 0;
  this.progressMap = [];
  let errorDownload = false;

  /**
   * This function returns a three component array, which contains
   * [totalsize, totalLoaded and errorDownload] of all the downloads happening
   * in this scene.
   * @returns {Array} 
   */
  this.getDownloadProgress = () => {
    let totalSize = 0;
    let totalLoaded = 0;
    let unknownFound = false;

    for (const key in this.progressMap) {
      const progress = this.progressMap[key];

      totalSize += progress[1];
      totalLoaded += progress[0];

      if (progress[1] == 0)
        unknownFound = true;
    }
    if (unknownFound) {
      totalSize = 0;
    }
    return [ totalSize, totalLoaded, errorDownload ];
  }

  //Stores the current progress of downloads
  this.onProgress = id => {
    return xhr => {
      this.progressMap[id] = [ xhr.loaded, xhr.total ];
    };
  }

  this.onError = xhr => {
    this.num_inputs = this.num_inputs - 1;
    errorDownload = true;
  };

  /**
   * Load the viewport from an external location provided by the url.
   * @param {String} URL - address to the file containing viewport information.
   */
  this.loadViewURL = url => {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = () => {
      if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        const viewData = JSON.parse(xmlhttp.responseText);
        scene.loadView(viewData);
      }
    }
    requestURL = resolveURL(url);
    xmlhttp.open("GET", requestURL, true);
    xmlhttp.send();
  }

/**
   * Load a legacy model(s) format with the provided URLs and parameters. This only loads the geometry
   * without any of the metadata. Therefore, extra parameters should be provided.
   * 
   * @deprecated
   */
  this.loadModelsURL = (urls, colours, opacities, timeEnabled, morphColour, finishCallback) => {
    const number = urls.length;
    this.num_inputs += number;
    for (let i = 0; i < number; i++) {
      const modelId = this.nextAvailableInternalZincModelId();
      const filename = urls[i];
      const loader = new JSONLoader();
      let colour = require('./zinc').defaultMaterialColor;
      let opacity = require('./zinc').defaultOpacity;
      if (colours != undefined && colours[i] != undefined)
        colour = colours[i] ? true : false;
      if (opacities != undefined && opacities[i] != undefined)
        opacity = opacities[i];
      let localTimeEnabled = 0;
      if (timeEnabled != undefined && timeEnabled[i] != undefined)
        localTimeEnabled = timeEnabled[i] ? true : false;
      let localMorphColour = 0;
      if (morphColour != undefined && morphColour[i] != undefined)
        localMorphColour = morphColour[i] ? true : false;
      loader.crossOrigin = "Anonymous";
      loader.load(resolveURL(filename), meshloader(modelId, colour, opacity, localTimeEnabled, localMorphColour, undefined,
        finishCallback), this.onProgress(i), this.onError);
    }
  }

   /**
   * Load a legacy file format containing the viewport and its meta file from an external 
   * location provided by the url. Use the new metadata format with
   * {@link Zinc.Scene#loadMetadataURL} instead.
   * 
   * @param {String} URL - address to the file containing viewport and model information.
   * @deprecated
   */
  this.loadFromViewURL = (jsonFilePrefix, finishCallback) => {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = () => {
      if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        const viewData = JSON.parse(xmlhttp.responseText);
        scene.loadView(viewData);
        const urls = [];
        const filename_prefix = jsonFilePrefix + "_";
        for (let i = 0; i < viewData.numberOfResources; i++) {
          const filename = filename_prefix + (i + 1) + ".json";
          urls.push(filename);
        }
        this.loadModelsURL(urls, viewData.colour, viewData.opacity, viewData.timeEnabled, viewData.morphColour, finishCallback);
      }
    }
    requestURL = resolveURL(jsonFilePrefix + "_view.json");
    xmlhttp.open("GET", requestURL, true);
    xmlhttp.send();
  }

  //Get the next available unique identifier for Zinc.Geometry
  this.nextAvailableInternalZincModelId = () => {
    return startingId++;
  };


  //Internal loader for a regular zinc geometry.
  const linesloader = (localTimeEnabled, localMorphColour, groupName, finishCallback) => {
    return (geometry, materials) => {
      const newLines = new (require('./lines').Lines)();
      let material = undefined;
      if (materials && materials[0]) {
        material = new THREE.LineBasicMaterial({color:materials[0].color.clone()});
        if (1.0 > materials[0].opacity) {
          material.transparent = true;
        }
        material.opacity = materials[0].opacity;
        material.morphTargets = localTimeEnabled;
        material.vertexColors = materials[0].vertexColors;
      }
      let options = {};
      options.localTimeEnabled = localTimeEnabled;
      options.localMorphColour = localMorphColour;

      newLines.createLineSegment(geometry, material, options);
      if (newLines) {
        newLines.setName(groupName);
        scene.addLines(newLines);
      }
      if (finishCallback != undefined && (typeof finishCallback == 'function'))
        finishCallback(newLines);
    };
  } 


    /**
   * Load lines into this scene object.
   * 
   * @param {String} metaurl - Provide informations such as transformations, colours 
   * and others for each of the glyph in the glyphsset.
   * @param {Boolean} timeEnabled - Indicate if  morphing is enabled.
   * @param {Boolean} morphColour - Indicate if color morphing is enabled.
   * @param {STRING} groupName - name to assign the pointset's groupname to.
   * @param {Function} finishCallback - Callback function which will be called
   * once the glyphset is succssfully load in.
   */
  this.loadLinesURL = (url, timeEnabled, morphColour, groupName, finishCallback) => {
	  let localTimeEnabled = 0;
	  this.num_inputs += 1;
	  if (timeEnabled != undefined)
		  localTimeEnabled = timeEnabled ? true : false;
	  let localMorphColour = 0;
	  if (morphColour != undefined)
		  localMorphColour = morphColour ? true : false;
	  let loader = new JSONLoader();
	  loader.crossOrigin = "Anonymous";
	  loader.load(url, linesloader(localTimeEnabled, localMorphColour, groupName, finishCallback),
		  this.onProgress(i), this.onError);
  }


  const loadGlyphset = (glyphsetData, glyphurl, groupName, finishCallback) => {
    const newGlyphset = new (require('./glyphset').Glyphset)();
    newGlyphset.duration = 3000;
    newGlyphset.load(glyphsetData, resolveURL(glyphurl), finishCallback);
    newGlyphset.groupName = groupName;
    scene.addGlyphset(newGlyphset);
  };

  //Load a glyphset into this scene.
  const onLoadGlyphsetReady = (xmlhttp, glyphurl, groupName, finishCallback) => {
    return () => {
      if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        const glyphsetData = JSON.parse(xmlhttp.responseText);
        loadGlyphset(glyphsetData, glyphurl, groupName, finishCallback);
      }
    };
  };

  //Internal loader for a regular zinc geometry.
  const pointsetloader = (localTimeEnabled, localMorphColour, groupName, finishCallback) => {
    return (geometry, materials) => {
      const newPointset = new (require('./pointset').Pointset)();
      let material = new THREE.PointsMaterial({ alphaTest: 0.5, size: 5, sizeAttenuation: false });
      if (materials && materials[0]) {
        if (1.0 > materials[0].opacity) {
          material.transparent = true;
        }
        material.opacity = materials[0].opacity;
        material.color = materials[0].color;
        material.morphTargets = localTimeEnabled;
        material.vertexColors = materials[0].vertexColors;
      }
      let options = {};
      options.localTimeEnabled = localTimeEnabled;
      options.localMorphColour = localMorphColour;

      newPointset.createMesh(geometry, material, options);
      if (newPointset) {
        newPointset.setName(groupName);
        scene.addPointset(newPointset);
      }
      if (finishCallback != undefined && (typeof finishCallback == 'function'))
        finishCallback(newPointset);
    };
  }


   /**
   * Read a STL file into this scene, the geometry will be presented as
   * {@link Zinc.Geometry}. 
   * 
   * @param {STRING} url - location to the STL file.
   * @param {STRING} groupName - name to assign the geometry's groupname to.
   * @param {Function} finishCallback - Callback function which will be called
   * once the STL geometry is succssfully loaded.
   */
  this.loadSTL = (url, groupName, finishCallback) => {
    this.num_inputs += 1;
    const modelId = this.nextAvailableInternalZincModelId();
    const colour = require('./zinc').defaultMaterialColor;
    const opacity = require('./zinc').defaultOpacity;
    const loader = new STLLoader();
    loader.crossOrigin = "Anonymous";
    loader.load(resolveURL(url), meshloader(modelId, colour, opacity, false,
      false, groupName, finishCallback));
  }

  /**
   * Read a OBJ file into this scene, the geometry will be presented as
   * {@link Zinc.Geometry}. 
   * 
   * @param {STRING} url - location to the STL file.
   * @param {STRING} groupName - name to assign the geometry's groupname to.
   * @param {Function} finishCallback - Callback function which will be called
   * once the OBJ geometry is succssfully loaded.
   */
  this.loadOBJ = (url, groupName, finishCallback) => {
    this.num_inputs += 1;
    const modelId = this.nextAvailableInternalZincModelId();
    const colour = require('./zinc').defaultMaterialColor;
    const opacity = require('./zinc').defaultOpacity;
    const loader = new OBJLoader();
    loader.crossOrigin = "Anonymous";
    loader.load(resolveURL(url), meshloader(modelId, colour, opacity, false,
      false, groupName, finishCallback));
  }

  //Loader for the OBJ format, 
  const objloader = (
    modelId,
    colour,
    opacity,
    localTimeEnabled,
    localMorphColour,
    groupName,
    finishCallback
  ) => {
    return object => {
      this.num_inputs++;
      object.traverse(child => {
        if (child instanceof THREE.Mesh) {
          const zincGeometry = addMeshToZincGeometry(child, modelId, localTimeEnabled, localMorphColour);
          scene.addGeometry(zincGeometry);
          if (zincGeometry.morph)
            zincGeometry.morph.name = groupName;
          zincGeometry.groupName = groupName;
          if (finishCallback != undefined && (typeof finishCallback == 'function'))
            finishCallback(zincGeometry);
        }
      });
    };
  }

  /**
   * Load a geometry into this scene, this is a subsequent called from 
   * {@link Zinc.Scene#loadMetadataURL}, although it can be used to read
   * in geometry into the scene externally.
   * 
   * @param {String} url - regular json model file providing geometry.
   * @param {Boolean} timeEnabled - Indicate if geometry morphing is enabled.
   * @param {Boolean} morphColour - Indicate if color morphing is enabled.
   * @param {STRING} groupName - name to assign the geometry's groupname to.
   * @param {STRING} fileFormat - name supported formats are STL, OBJ and JSON.
   * @param {Function} finishCallback - Callback function which will be called
   * once the geometry is succssfully loaded in.
   */
  const loadMetaModel = (url, timeEnabled, morphColour, groupName, fileFormat, finishCallback) => {
    this.num_inputs += 1;
    const modelId = this.nextAvailableInternalZincModelId();
    const colour = require('./zinc').defaultMaterialColor;
    const opacity = require('./zinc').defaultOpacity;
    let localTimeEnabled = 0;
    if (timeEnabled != undefined)
      localTimeEnabled = timeEnabled ? true : false;
    let localMorphColour = 0;
    if (morphColour != undefined)
      localMorphColour = morphColour ? true : false;
    let loader = new JSONLoader();
    if (fileFormat !== undefined) {
      if (fileFormat == "STL") {
        loader = new STLLoader();
      } else if (fileFormat == "OBJ") {
        loader = new OBJLoader();
        loader.crossOrigin = "Anonymous";
        loader.load(url, objloader(modelId, colour, opacity, localTimeEnabled,
          localMorphColour, groupName, finishCallback), this.onProgress(i), this.onError);
        return;
      }
    }
    loader.crossOrigin = "Anonymous";
    loader.load(url, meshloader(modelId, colour, opacity, localTimeEnabled,
      localMorphColour, groupName, finishCallback), this.onProgress(i), this.onError);
  };

  //Object to keep track of number of items downloaded and when add items are downloaded
  //allCompletedCallback is called
  const metaFinishCallback = function (numberOfDownloaded, finishCallback, allCompletedCallback) {
    let downloadedItem = 0;
    return zincGeometry => {
      downloadedItem = downloadedItem + 1;
      if (finishCallback != undefined && (typeof finishCallback == 'function'))
        finishCallback(zincGeometry);
      if (downloadedItem == numberOfDownloaded)
        if (allCompletedCallback != undefined && (typeof allCompletedCallback == 'function'))
          allCompletedCallback();
    };
  };

  /**
   * Load a pointset into this scene object.
   * 
   * @param {String} metaurl - Provide informations such as transformations, colours 
   * and others for each of the glyph in the glyphsset.
   * @param {Boolean} timeEnabled - Indicate if  morphing is enabled.
   * @param {Boolean} morphColour - Indicate if color morphing is enabled.
   * @param {STRING} groupName - name to assign the pointset's groupname to.
   * @param {Function} finishCallback - Callback function which will be called
   * once the glyphset is succssfully load in.
   */
  this.loadPointsetURL = (url, timeEnabled, morphColour, groupName, finishCallback) => {
    let localTimeEnabled = 0;
    this.num_inputs += 1;
    if (timeEnabled != undefined)
      localTimeEnabled = timeEnabled ? true : false;
    let localMorphColour = 0;
    if (morphColour != undefined)
      localMorphColour = morphColour ? true : false;
    let loader = new JSONLoader();
    loader.crossOrigin = "Anonymous";
    loader.load(url, pointsetloader(localTimeEnabled, localMorphColour, groupName, finishCallback),
      this.onProgress(i), this.onError);
  }

  /**
   * Load a glyphset into this scene object.
   * 
   * @param {String} metaurl - Provide informations such as transformations, colours 
   * and others for each of the glyph in the glyphsset.
   * @param {String} glyphurl - regular json model file providing geometry of the glyph.
   * @param {String} groupName - name to assign the glyphset's groupname to.
   * @param {Function} finishCallback - Callback function which will be called
   * once the glyphset is succssfully load in.
   */
  this.loadGlyphsetURL = (metaurl, glyphurl, groupName, finishCallback) => {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = onLoadGlyphsetReady(xmlhttp, glyphurl, groupName, finishCallback);
    xmlhttp.open("GET", resolveURL(metaurl), true);
    xmlhttp.send();
  }

  //Internal loader for a regular zinc geometry.
  const meshloader = (
    modelId,
    colour,
    opacity,
    localTimeEnabled,
    localMorphColour,
    groupName,
    finishCallback
  ) => {
    return (geometry, materials) => {
      let material = undefined;
      if (materials && materials[0]) {
        material = materials[0];
      }
      const zincGeometry = scene.addZincGeometry(geometry, modelId, colour, opacity, localTimeEnabled, localMorphColour, false, undefined, material, groupName);
      if (finishCallback != undefined && (typeof finishCallback == 'function'))
        finishCallback(zincGeometry);
    };
  }

  //Function to process each of the metadata item. There are two types of metadata item,
  //one for Zinc.Geometry and one for Zinc.Glyphset.
  const readMetadataItem = (referenceURL, item, finishCallback) => {
    if (item) {
      let newURL = item.URL;
      if (referenceURL)
        newURL = (new URL(item.URL, referenceURL)).href;
      if (item.Type == "Surfaces") {
        loadMetaModel(newURL, item.MorphVertices, item.MorphColours, item.GroupName, item.FileFormat, finishCallback);
      } else if (item.Type == "Glyph") {
        let newGeometryURL = item.GlyphGeometriesURL;
        if (referenceURL) {
          newGeometryURL = (new URL(item.GlyphGeometriesURL, referenceURL)).href;
        }
        this.loadGlyphsetURL(newURL, newGeometryURL, item.GroupName, finishCallback);
      } else if (item.Type == "Points") {
        this.loadPointsetURL(newURL, item.MorphVertices, item.MorphColours, item.GroupName, finishCallback);
      } else if (item.Type == "Lines") {
        this.loadLinesURL(newURL, item.MorphVertices, item.MorphColours, item.GroupName, finishCallback);
      } else if (item.Type == "View") {
        this.loadViewURL(newURL);
      }
    }
  };



  /**
    * Load a metadata file from the provided URL into this scene. Once
    * succssful scene proceeds to read each items into scene for visualisations.
    * 
    * @param {String} url - Location of the metafile
    * @param {Function} finishCallback - Callback function which will be called
    * for each glyphset and geometry that has been written in.
    */
  this.loadMetadataURL = (url, finishCallback, allCompletedCallback) => {
    const xmlhttp = new XMLHttpRequest();
    var requestURL = resolveURL(url);
    xmlhttp.onreadystatechange = () => {
      if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        let referenceURL = xmlhttp.responseURL;
        if (referenceURL === undefined)
          referenceURL = (new URL(requestURL)).href;
        const metadata = JSON.parse(xmlhttp.responseText);
        let numberOfObjects = metadata.length;
        // view file does not receive callback
        for (var i = 0; i < metadata.length; i++) {
          if (metadata[i] && metadata[i].Type == "View")
            numberOfObjects = numberOfObjects - 1;
        }
        var callback = new metaFinishCallback(numberOfObjects, finishCallback, allCompletedCallback);
        for (var i = 0; i < metadata.length; i++)
          readMetadataItem(referenceURL, metadata[i], callback);
      }
    }

    xmlhttp.open("GET", requestURL, true);
    xmlhttp.send();
  }



}