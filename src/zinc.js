/**
 * Provides a global namespace for the Zinc javascript library and some default parameters for it.
 * 
 * @namespace
 * @author Alan Wu
 */
var Zinc = { REVISION: '28' };

Zinc.defaultMaterialColor = 0x7F1F1A;
Zinc.defaultOpacity = 1.0;

Zinc.Geometry = require('./geometry').Geometry;
Zinc.Glyph = require('./glyph').Glyph;
Zinc.Glyphset = require('./glyphset').Glyphset;
Zinc.Renderer = require('./renderer').Renderer;
Zinc.Scene = require('./scene').Scene;

Zinc.Viewport = require('./controls').Viewport;
Zinc.CameraControls = require('./controls').CameraControls;
Zinc.SmoothCameraTransition = require('./controls').SmoothCameraTransition;
Zinc.RayCaster = require('./controls').RayCaster;
Zinc.CameraAutoTumble = require('./controls').CameraAutoTumble;
Zinc.loadExternalFile = require('./utilities').loadExternalFile;
Zinc.loadExternalFiles = require('./utilities').loadExternalFiles;
Zinc.StereoEffect = require('./controls').StereoEffect;

module.exports = Zinc;
