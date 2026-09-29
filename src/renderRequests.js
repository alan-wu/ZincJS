/*
 * Frame requests from resources that do not belong to a scene, e.g. shared
 * textures loaded asynchronously. Renderers in render on demand mode
 * subscribe to these so the result is drawn once it arrives.
 */
const listeners = new Set();

const onRenderRequest = (callback) => {
  listeners.add(callback);
}

const offRenderRequest = (callback) => {
  listeners.delete(callback);
}

const requestRenderAll = () => {
  listeners.forEach((callback) => callback());
}

export { onRenderRequest, offRenderRequest, requestRenderAll };
