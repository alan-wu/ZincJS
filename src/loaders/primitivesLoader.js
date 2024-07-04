const JSONLoader = require('./JSONLoader').JSONLoader;

const mergeGeometries = (geometries) => {

  const merge = (geometry1, geometry2) => {
    geometry1.merge(geometry2);
  }

  if (geometries && geometries.length > 0) {
    while (geometries.length > 1) {
      const geometry2 = geometries.splice(1,1);
      merge(geometries[0], geometry2[0]);
    }
    //geometries[0].computeFaceNormals();
    return geometries[0];
  }
  return undefined;
}

const MultiSourcesHandler = function(numberIn, onLoadCallback) {
  const allData = [];
  const number = numberIn;
  const callback = callback;
  const onLoad = onLoadCallback;
  const onProgress = onProgress;
  const onError  = onError;
  let totalDownloaded = 0;

  this.itemDownloaded = (index, args) => {
    allData[index]= args;
    totalDownloaded++;
    if (totalDownloaded == number) {
      const materials = allData[0][1];
      const geometries = allData.map((data) => data[0]);
      //All geometries will be merged into the first one
      const geometry = mergeGeometries(geometries);

      for (let i = 1; i < number; i++) {
        allData[index][0].dispose();
        allData[index][1].forEach((material) => material.dispose());
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

  //Load the first file then the rest will be handled separately
  const loadFromMultipleSources = (urls, onLoad, onProgress, onError, options) => {
    const number = urls.length;
    const msHandler = new MultiSourcesHandler(number, onLoad, onProgress, onError);
    let index = 0;
    urls.forEach((url) => {
      const newOptions = options ? {...options} : {};
      newOptions.msHandler = msHandler;
      newOptions.index = index;
      index++;
      loadFromSingleSource(url, onLoad, onProgress, onError, newOptions);
    });
  }

  const loadFromSingleSource = (url, onLoad, onProgress, onError, options) => {
    if (MAX_DOWNLOAD > concurrentDownloads) {
      ++concurrentDownloads;
      loader.crossOrigin = this.crossOrigin;
      const onLoadCallback = new onFinally(onLoad, this, options);
      const onErrorCallback = new onFinally(onError, this, options);
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

  this.load = (url, onLoad, onProgress, onError, options) => {
    if (Array.isArray(url)) {
      loadFromMultipleSources(url, onLoad, onProgress, onError, options);
    } else {
      loadFromSingleSource(url, onLoad, onProgress, onError, options);
    }
  }

  this.loadFromWaitingList = () => {
    const item = waitingList.shift();
    if (item) {
      this.load(item.url, item.onLoad, item.onProgress, item.onError, item.options);
    }
  }

  const onMultiFilesFinish = function(callback, loader, options) {
    return (...args) => {
      --concurrentDownloads;
      if (callback) {
        callback(...args, options);
      }
      loader.loadFromWaitingList();
    }
  }

  const onFinally = function(callback, loader, options) {
    return (...args) => {
      --concurrentDownloads;
      if (options?.msHandler) {
        options.msHandler.itemDownloaded(options.index, args);
      } else {
        if (callback) {
          callback(...args);
        }
      }
      loader.loadFromWaitingList();
    }
  }

  this.parse = data => {
    return loader.parse(data);
  }

}
