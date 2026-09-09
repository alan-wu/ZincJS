import * as THREE from 'three/webgpu';
import PACKAGE from '../package.json';

// Import all internal primitives and modules
import { Geometry } from './primitives/geometry';
import { Glyph } from './primitives/glyph';
import { Glyphset } from './primitives/glyphset';
import { Pointset } from './primitives/pointset';
import { Label } from './primitives/label';
import { Lines } from './primitives/lines';
import { TextureArray } from './texture/textureArray';
import { TextureSlides } from './primitives/textureSlides';
import { Renderer } from './renderer';
import { Scene } from './scene';
import {
  createPrimitivesFromNIFTI,
  createTextureFromNIFTI
} from './loaders/niftiReader';
//import { GeometryCSG } from './geometryCSG';
//import { GlyphsetCSG } from './glyphsetCSG';
import {
  Viewport,
  CameraControls,
  SmoothCameraTransition,
  RayCaster,
  CameraAutoTumble,
  StereoEffect
} from './controls';
import { loadExternalFile, loadExternalFiles } from './utilities';

const version = PACKAGE.version;

/**
 * Provides a global namespace for the Zinc javascript library and some default parameters for it.
 *
 * @namespace
 * @author Alan Wu
 */
const Zinc = function() {
  this.Revision = version;
  this.defaultMaterialColor = 0xFFFFFF;
  this.defaultOpacity = 1.0;
  // Assign hoisted modules to the instance
  this.Geometry = Geometry;
  this.Glyph = Glyph;
  this.Glyphset = Glyphset;
  this.Pointset = Pointset;
  this.Label = Label;
  this.Lines = Lines;
  this.TextureSlides = TextureSlides;
  this.TextureArray = TextureArray;
  this.Renderer = Renderer;
  this.Scene = Scene;
  //this.GeometryCSG = GeometryCSG;
  //this.GlyphsetCSG = GlyphsetCSG;
  this.Viewport = Viewport;
  this.CameraControls = CameraControls;
  this.SmoothCameraTransition = SmoothCameraTransition;
  this.RayCaster = RayCaster;
  this.CameraAutoTumble = CameraAutoTumble;
  this.StereoEffect = StereoEffect;
  this.loadExternalFile = loadExternalFile;
  this.loadExternalFiles = loadExternalFiles;
  this.createPrimitivesFromNIFTI = createPrimitivesFromNIFTI;
  this.createTextureFromNIFTI = createTextureFromNIFTI;
  this.THREE = THREE;
};

export default new Zinc();
