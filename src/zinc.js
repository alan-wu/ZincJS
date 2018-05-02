/**
 * Provides a global namespace for the Zinc javascript library and some default parameters for it.
 * 
 * @namespace
 * @author Alan Wu
 */

var Zinc = function() {
  this.Revision = 28;

  this.defaultMaterialColor = 0x7F1F1A;
  this.defaultOpacity = 1.0;

  this.Geometry = require('./geometry').Geometry;
  this.Glyph = require('./glyph').Glyph;
  this.Glyphset = require('./glyphset').Glyphset;
  this.Renderer = require('./renderer').Renderer;
  this.Scene = require('./scene').Scene;

  this.Viewport = require('./controls').Viewport;
  this.CameraControls = require('./controls').CameraControls;
  this.SmoothCameraTransition = require('./controls').SmoothCameraTransition;
  this.RayCaster = require('./controls').RayCaster;
  this.CameraAutoTumble = require('./controls').CameraAutoTumble;
  this.loadExternalFile = require('./utilities').loadExternalFile;
  this.loadExternalFiles = require('./utilities').loadExternalFiles;
  this.StereoEffect = require('./controls').StereoEffect;
}

module.exports = new Zinc();
