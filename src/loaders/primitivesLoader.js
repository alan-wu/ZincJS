const JSONLoader = require('./JSONLoader').JSONLoader;
const THREE = require('three');
const FileLoader = THREE.FileLoader;

const mergeGeometries = (geometries) => {
  const merge = (geometry1, geometry2) => {
    geometry1.merge(geometry2);
  }

  if (geometries && geometries.length > 0) {
    while (geometries.length > 1) {
      const geometry2 = geometries.splice(1,1);
      merge(geometries[0], geometry2[0]);
    }
    return geometries[0];
  }
  return undefined;
}

const IndexedSourcesHandler = function(urlIn, crossOrigin, onDownloadedCallback) {
  const loader = new FileLoader();
  const jsonLoader = new JSONLoader();
  loader.crossOrigin = crossOrigin;
  const url = urlIn;
  const onDownloaded = onDownloadedCallback;
  let data = undefined;
  let downloading = false;
  let finished = false;
  let error = undefined;
  const items = [];

  const processItemDownloaded = (item) => {
    const modelData = data[item.index];
    if (modelData) {
      let obj = jsonLoader.parse( modelData );
      item.onLoad(obj.geometry, obj.materials);
    } else {
      processItemError(item, {responseURL: url});
    }
  }

  const processItemError = (item) => {
    if (item.onError) {
      if (!error) {
        error = {responseURL: url};
      }
      item.onError(error);
    }
  }

  this.downloadCompleted = (args) => {
    try {
      data = JSON.parse(args[0]);
      downloading = false;
      finished = true;
      if (Array.isArray(data)) {
        items.forEach(item => processItemDownloaded(item));
      } else {
        items.forEach(item => processItemError(item));
      }
    } catch {
      items.forEach(item => processItemError(item));
    }
  }

  const errorHandling = () => {
    return xhr => {
      error = xhr;
      finished = true;
      downloading = false;
      items.forEach((item) => {
        processItemError(item);
      });
    }
  }

  const progressHandling = () => {
    return xhr => {
      items.forEach((item) => {
        if (item.onProgress) {
          item.onProgress(xhr);
        }
      });
    }
  }

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
        processItemError(error);
      }
    } else if (downloading) {
      //quene it up
      items.push(item);
    } else {
      items.push(item);
      downloading = true;
      loader.load(url, onDownloaded, progressHandling, errorHandling);
    }
  }
}

const MultiSourcesHandler = function(numberIn, onLoadCallback) {
  const allData = [];
  const number = numberIn;
  const onLoad = onLoadCallback;
  let totalDownloaded = 0;

  this.itemDownloaded = (order, args) => {
    allData[order]= args;
    totalDownloaded++;
    if (totalDownloaded == number) {
      const materials = allData[0][1];
      const geometries = allData.map((data) => data[0]);
      //All geometries will be merged into the first one
      const geometry = mergeGeometries(geometries);
      for (let i = 1; i < number; i++) {
        allData[order][0].dispose();
        allData[order][1].forEach((material) => material.dispose());
      }
      onLoad(geometry, materials);
    }
  }
}

exports.PrimitivesLoader = function () {
  let concurrentDownloads = 0;
  const MAX_DOWNLOAD = 20;
  this.crossOrigin = "Anonymous";
  const loader = new JSONLoader();
  const waitingList = [];
  //URL to loader pair
  const indexedLoaders = {};

  //Load the first file then the rest will be handled separately
  const loadFromMultipleSources = (urls, onLoad, onProgress, onError, options) => {
    const number = urls.length;
    const msHandler = new MultiSourcesHandler(number, onLoad);
    //The order here will give us hint on the sequence on merging the primitives
    let order = 0;
    urls.forEach((url) => {
      const newOptions = options ? {...options} : {};
      newOptions.msHandler = msHandler;
      newOptions.order = order;
      order++;
      loadFromSingleSource(url, onLoad, onProgress, onError, newOptions);
    });
  }

  const handleIndexedSource = (url, onLoad, onProgress, onError, options) => {
    const newOptions = options ? {...options} : {};
    let indexedLoader = indexedLoaders[url];
    if (!indexedLoader) {
      if (MAX_DOWNLOAD > concurrentDownloads) {
        const onLoadCallback = new onFinally(undefined, this, newOptions);
        ++concurrentDownloads;
        indexedLoader = new IndexedSourcesHandler(url, this.crossOrigin, onLoadCallback);
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
  }

  const loadFromSingleSource = (url, onLoad, onProgress, onError, options) => {
    if (options && (options.index !== undefined) ) {
      handleIndexedSource(url, onLoad, onProgress, onError, options);
    } else {
      //Standard loading
      if (MAX_DOWNLOAD > concurrentDownloads) {
        ++concurrentDownloads;
        const onLoadCallback = new onFinally(onLoad, this, options);
        const onErrorCallback = new onFinally(onError, this, options);
        loader.crossOrigin = this.crossOrigin;
        loader.load(url, onLoadCallback, onProgress, onErrorCallback);
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
  }

  this.load = (url, onLoad, onProgress, onError, options) => {
    if (Array.isArray(url)) {
      loadFromMultipleSources(url, onLoad, onProgress, onError, options);
    } else {
      loadFromSingleSource(url, onLoad, onProgress, onError, options);
    }
  }

  this.loadFromWaitingList = () => {
    while (MAX_DOWNLOAD > concurrentDownloads) {
      const item = waitingList.shift();
      if (item) {
        this.load(item.url, item.onLoad, item.onProgress, item.onError, item.options);
      } else {
        return;
      }
    }
  }

  this.itemRemainingCheck = () => {
    if (waitingList.length === 0 && concurrentDownloads === 0) {
      for (let key in indexedLoaders) {
        if (indexedLoaders.hasOwnProperty(key)) {
          delete indexedLoaders[key];
        }
      }
    }
  }

  const onFinally = function(callback, loader, options) {
    return (...args) => {
      --concurrentDownloads;
      if (options?.msHandler) {
        options.msHandler.itemDownloaded(options.order, args);
      } else if (options?.isHandler) {
        options.isHandler.downloadCompleted(args);
      } else {
        if (callback) {
          callback(...args);
        }
      }
      loader.loadFromWaitingList();
      loader.itemRemainingCheck();
    }
  }

  this.parse = data => {
    return loader.parse(data);
  }

}
