// prepare/setup.js
import createWebGLContext from 'gl';

document.body.innerHTML = '<div id="container" style="width:1024px;height:1024px"></div>';

Object.defineProperty(navigator, 'userAgent', {
  value: 'node.js',
  configurable: true
});

import util from 'node:util';
if (!util.styleText) {
  util.styleText = (format, text) => text;
}

const glContext = createWebGLContext(1024, 1024);

const originalCreateElement = document.createElement.bind(document);

document.createElement = (tagName) => {
  if (tagName.toLowerCase() === 'canvas') {
    const canvas = originalCreateElement('canvas');
    // Mock getContext to return your headless context
    canvas.getContext = (contextType) => {
      if (contextType === 'webgl' || contextType === 'experimental-webgl') {
        return glContext;
      }
      return null;
    };
    return canvas;
  }
  return originalCreateElement(tagName);
};