const JSONLoader = require('./JSONLoader').JSONLoader;

exports.PrimitivesLoader = function () {
  let concurrentDownloads = 0;
  const MAX_DOWNLOAD = 20;
  this.crossOrigin = "Anonymous";
  const loader = new JSONLoader();
  const waitingList = [];

  this.load = (url, onLoad, onProgress, onError) => {
    if (MAX_DOWNLOAD > concurrentDownloads) {
      ++concurrentDownloads;
      loader.crossOrigin = this.crossOrigin;
      const onLoadCallback = new onFinally(onLoad, this);
      const onErrorCallback = new onFinally(onError, this);
      loader.load(url, onLoadCallback, onProgress, onErrorCallback);
    } else {
      waitingList.push({
        url,
        onLoad,
        onProgress,
        onError
      });
    }
  }

  this.loadFromWaitingList = () => {
    const item = waitingList.shift();
    if (item)
      this.load(item.url, item.onLoad, item.onProgress, item.onError);
  }

  const onFinally = function(callback, loader) {
    return (...args) => {
      --concurrentDownloads;
      if (callback) {
        callback(...args);
      }
      loader.loadFromWaitingList();
    }
  }


  this.parse = data => {
    return loader.parse(data);
  }

}
