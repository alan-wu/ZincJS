import { JSONLoader } from './JSONLoader';
import { mergeGeometries as mergeBufferGeometries } from '../utilities';
import * as THREE from 'three/webgpu';
const FileLoader = THREE.FileLoader;

const mergeGlyphData = (glyphData) => {
  const merge = (glyphData1, glyphData2) => {
    glyphData1.metadata.number_of_vertices += glyphData2.metadata.number_of_vertices;
    if ('labels' in glyphData1 && glyphData2.labels) {
      const labels = glyphData2.labels;
      for (let i = 0; i < labels.length; i++) {
        glyphData1.labels.push(labels[i]);
      }
    }
    const fields = ['axis1', 'axis2', 'axis3', 'colors', 'positions', 'scale'];
    fields.forEach((field) => {
      if (field in glyphData1) {
        Object.keys(glyphData1[field]).forEach((step) => {
          const len = glyphData2[field][step].length;
          for (let i = 0; i < len; i++) {
            glyphData1[field][step].push(glyphData2[field][step][i]);
          }
        });
      }
    });
  };

  if (glyphData && glyphData.length > 0) {
    while (glyphData.length > 1) {
      const glyphData2 = glyphData.splice(1, 1);
      merge(glyphData[0], glyphData2[0]);
    }
  }
};

const mergeGeometries = (geometries) => {
  if (geometries && geometries.length > 0) {
    if (geometries.length === 1) {
      return geometries[0];
    }
    const merged = mergeBufferGeometries(geometries);
    geometries.forEach((geometry) => geometry.dispose());
    return merged;
  }
  return undefined;
};

const IndexedSourcesHandler = function (urlIn, crossOrigin, onDownloadedCallback, onErrorCallback) {
  const fileLoader = new FileLoader();
  const jsonLoader = new JSONLoader();
  fileLoader.crossOrigin = crossOrigin;
  const url = urlIn;
  const onDownloaded = onDownloadedCallback;
  const onDownloadError = onErrorCallback;
  let data = undefined;
  let downloading = false;
  let finished = false;
  let error = undefined;
  const items = [];

  const processItemDownloaded = (item) => {
    const modelData = data[item.index];
    if (modelData) {
      if ('GlyphGeometriesURL' in modelData) {
        item.onLoad(modelData);
      } else {
        let obj = jsonLoader.parse(modelData);
        item.onLoad(obj.geometry, obj.materials);
      }
    } else {
      processItemError(item, { responseURL: url });
    }
  };

  const processItemError = (item) => {
    if (item.onError) {
      if (!error) {
        error = { responseURL: url };
      }
      item.onError(error);
    }
  };

  this.downloadCompleted = (args) => {
    try {
      data = JSON.parse(args[0]);
      downloading = false;
      finished = true;
      if (Array.isArray(data)) {
        items.forEach((item) => processItemDownloaded(item));
      } else {
        items.forEach((item) => processItemError(item));
      }
    } catch {
      items.forEach((item) => processItemError(item));
    }
  };

  const errorHandling = () => {
    return (xhr) => {
      error = xhr;
      finished = true;
      downloading = false;
      items.forEach((item) => {
        processItemError(item);
      });
      if (onDownloadError) {
        onDownloadError(xhr);
      }
    };
  };

  const progressHandling = () => {
    return (xhr) => {
      items.forEach((item) => {
        if (item.onProgress) {
          item.onProgress(xhr);
        }
      });
    };
  };

  this.load = (index, onLoad, onProgress, onError) => {
    const item = {
      index,
      onLoad,
      onProgress,
      onError,
    };
    if (finished) {
      if (data) {
        processItemDownloaded(item);
      } else {
        processItemError(item);
      }
    } else if (downloading) {
      //quene it up
      items.push(item);
    } else {
      items.push(item);
      downloading = true;
      fileLoader.load(url, onDownloaded, progressHandling(), errorHandling());
    }
  };
};

const MultiSourcesHandler = function (numberIn, onLoadCallback, onErrorCallback, options) {
  const allData = [];
  const number = numberIn;
  const onLoad = onLoadCallback;
  const onError = onErrorCallback;
  let totalDownloaded = 0;
  let failure = undefined;
  const isGlyphData = options?.isGlyphsets;

  //Release whatever was downloaded successfully and report the first failure
  const reportFailure = () => {
    if (!isGlyphData) {
      allData.forEach((data) => {
        if (data) {
          data[0]?.dispose?.();
          data[1]?.forEach((material) => material.dispose());
        }
      });
    }
    if (onError) {
      onError(...failure);
    }
  };

  this.itemFailed = (order, args) => {
    if (!failure) {
      failure = args;
    }
    totalDownloaded++;
    if (totalDownloaded == number) {
      reportFailure();
    }
  };

  this.itemDownloaded = (order, args) => {
    allData[order] = args;
    totalDownloaded++;
    if (totalDownloaded == number) {
      if (failure) {
        reportFailure();
      } else if (allData.length > 0) {
        //Assume when item length is one then it is a glyphset otherwise geometry
        if (!isGlyphData) {
          const materials = allData[0][1];
          const geometries = allData.map((data) => data[0]);
          //All geometries will be merged into the first one
          const geometry = mergeGeometries(geometries);
          //mergeGeometries has disposed the source geometries,
          //only the first set of materials is kept
          for (let i = 1; i < number; i++) {
            allData[i][1]?.forEach((material) => material.dispose());
          }
          onLoad(geometry, materials);
        } else {
          const glyphData = allData.map((item) => {
            return JSON.parse(item[0]);
          });
          mergeGlyphData(glyphData);
          onLoad(glyphData[0]);
        }
      }
    }
  };
};

const PrimitivesLoader = function () {
  let concurrentDownloads = 0;
  const MAX_DOWNLOAD = 20;
  this.crossOrigin = 'Anonymous';
  const jsonloader = new JSONLoader();
  const fileloader = new FileLoader();
  fileloader.crossOrigin = 'Anonymous';
  const waitingList = [];
  //URL to loader pair
  const indexedLoaders = {};

  //Load the first file then the rest will be handled separately
  const loadFromMultipleSources = (urls, onLoad, onProgress, onError, options) => {
    const number = urls.length;
    const msHandler = new MultiSourcesHandler(number, onLoad, onError, options);
    //The order here will give us hint on the sequence on merging the primitives
    let order = 0;
    urls.forEach((url) => {
      const newOptions = options ? { ...options } : {};
      newOptions.msHandler = msHandler;
      newOptions.order = order;
      order++;
      loadFromSingleSource(url, onLoad, onProgress, onError, newOptions);
    });
  };

  const handleIndexedSource = (url, onLoad, onProgress, onError, options) => {
    const newOptions = options ? { ...options } : {};
    let indexedLoader = indexedLoaders[url];
    if (!indexedLoader) {
      if (MAX_DOWNLOAD > concurrentDownloads) {
        const onLoadCallback = new onFinally(undefined, this, newOptions);
        const onErrorCallback = new onFinally(undefined, this, {});
        ++concurrentDownloads;
        indexedLoader = new IndexedSourcesHandler(
          url,
          this.crossOrigin,
          onLoadCallback,
          onErrorCallback,
        );
        indexedLoaders[url] = indexedLoader;
      } else {
        waitingList.push({
          url,
          onLoad,
          onProgress,
          onError,
          options,
        });
      }
    }
    if (indexedLoader) {
      newOptions.isHandler = indexedLoader;
      indexedLoader.load(options.index, onLoad, onProgress, onError);
    }
  };

  const loadFromSingleSource = (url, onLoad, onProgress, onError, options) => {
    if (options && options.index !== undefined) {
      handleIndexedSource(url, onLoad, onProgress, onError, options);
    } else {
      //Standard loading
      if (MAX_DOWNLOAD > concurrentDownloads) {
        ++concurrentDownloads;
        const onLoadCallback = new onFinally(onLoad, this, options);
        const onErrorCallback = new onFinally(onError, this, options, true);
        if (!options?.isGlyphsets) {
          jsonloader.crossOrigin = this.crossOrigin;
          jsonloader.load(url, onLoadCallback, onProgress, onErrorCallback);
        } else {
          fileloader.load(url, onLoadCallback, onProgress, onErrorCallback);
        }
      } else {
        waitingList.push({
          url,
          onLoad,
          onProgress,
          onError,
          options,
        });
      }
    }
  };

  this.load = (url, onLoad, onProgress, onError, options) => {
    if (Array.isArray(url)) {
      loadFromMultipleSources(url, onLoad, onProgress, onError, options);
    } else {
      loadFromSingleSource(url, onLoad, onProgress, onError, options);
    }
  };

  this.loadFromWaitingList = () => {
    while (MAX_DOWNLOAD > concurrentDownloads) {
      const item = waitingList.shift();
      if (item) {
        this.load(item.url, item.onLoad, item.onProgress, item.onError, item.options);
      } else {
        return;
      }
    }
  };

  this.itemRemainingCheck = () => {
    if (waitingList.length === 0 && concurrentDownloads === 0) {
      for (let key in indexedLoaders) {
        if (indexedLoaders.hasOwnProperty(key)) {
          delete indexedLoaders[key];
        }
      }
    }
  };

  const onFinally = function (callback, loader, options, isError = false) {
    return (...args) => {
      --concurrentDownloads;
      if (options?.msHandler) {
        if (isError) {
          options.msHandler.itemFailed(options.order, args);
        } else {
          options.msHandler.itemDownloaded(options.order, args);
        }
      } else if (options?.isHandler) {
        options.isHandler.downloadCompleted(args);
      } else {
        if (callback) {
          callback(...args);
        }
      }
      loader.loadFromWaitingList();
      loader.itemRemainingCheck();
    };
  };

  this.parse = (data) => {
    return jsonloader.parse(data);
  };
};

export { PrimitivesLoader };
