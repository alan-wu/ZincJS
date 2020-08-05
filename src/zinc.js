require("url-polyfill");

/**
 * Provides a global namespace for the Zinc javascript library and some default parameters for it.
 * 
 * @namespace
 * @author Alan Wu
 */

const Zinc = function() {
  this.Revision = 29;
  this.defaultMaterialColor = 0xFFFFFF;
  this.defaultOpacity = 1.0;
  this.modelPrefix = undefined;
  this.Geometry = require('./primitives/geometry').Geometry;
  this.Glyph = require('./primitives/glyph').Glyph;
  this.Glyphset = require('./primitives/glyphset').Glyphset;
  this.Pointset = require('./primitives/pointset').Pointset;
  this.Lines = require('./primitives/lines').Lines;
  this.Renderer = require('./renderer').Renderer;
  this.Scene = require('./scene').Scene;
  this.GeometryCSG = require('./geometryCSG').GeometryCSG;
  this.GlyphsetCSG = require('./glyphsetCSG').GlyphsetCSG;
  this.Viewport = require('./controls').Viewport;
  this.CameraControls = require('./controls').CameraControls;
  this.SmoothCameraTransition = require('./controls').SmoothCameraTransition;
  this.RayCaster = require('./controls').RayCaster;
  this.CameraAutoTumble = require('./controls').CameraAutoTumble;
  this.StereoEffect = require('./controls').StereoEffect;
  this.loadExternalFile = require('./utilities').loadExternalFile;
  this.loadExternalFiles = require('./utilities').loadExternalFiles;
  this.THREE = require('three'); 
  
};

module.exports = new Zinc();
