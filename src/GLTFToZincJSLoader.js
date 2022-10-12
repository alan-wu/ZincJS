const THREE = require('three');

const GLTFLoader = require('three/examples/jsm/loaders/GLTFLoader').GLTFLoader;

const GLTFToZincJSLoader = function () {

  const _this = this;

  this.parseGLTFObjects = (object, region, depth, finishCallback) => {
    let childRegion = region;
    if (depth !== 0) {
      if (object.type === "Object3D") {
        if (object.name !== "") {
          if (region)
            childRegion = region.findOrCreateChildFromPath(object.name);
            if (childRegion) {
              const group = childRegion.getGroup();
              group.position.copy(object.position);
              group.rotation.copy(object.rotation);
              group.quaternion.copy(object.quaternion);
              group.matrixAutoUpdate = true;
            }
        }
      } else {
        let zincGeometry = undefined;
        if (object.type === "Mesh") {
          zincGeometry = new (require('./primitives/geometry').Geometry)();
        } else if (object.type === "LineSegments") {
          zincGeometry = new (require('./primitives/lines').Lines)();
        } else if (object.type === "Points") {
          zincGeometry = new (require('./primitives/pointset').Pointset)();
        }
        if (zincGeometry) {
          let localTimeEnabled = false;
          let localMorphColour = false;
          if (object.geometry && object.geometry.morphAttributes) {
            localTimeEnabled = object.geometry.morphAttributes.position ? true : false;
            localMorphColour = object.geometry.morphAttributes.color ? true : false;
          }
          zincGeometry.setMesh(object.clone(), localTimeEnabled, localMorphColour);
          region.addZincObject(zincGeometry);
          zincGeometry.groupName = zincGeometry.morph.name;
          zincGeometry.morph.matrixAutoUpdate = true;
          if (finishCallback != undefined && (typeof finishCallback == 'function'))
            finishCallback(zincGeometry);
        }
      }
    }
    depth++;
    object.children.forEach( child => {
      _this.parseGLTFObjects(child, childRegion, depth, finishCallback);
    });
  }

  this.setCamera = scene => {
    scene.viewAll();
    const cameraControls = scene.getZincCameraControls();
    const viewport = cameraControls.getCurrentViewport();
    cameraControls.addViewport('default', viewport);
    cameraControls.setDefaultViewport('default');
  }

  /**
   * Load GLTF into this scene object.
   * 
   * @param {String} url - URL to the GLTF file
   * @param {Function} finishCallback - Callback function which will be called
   * once the glyphset is succssfully load in.
   */
  this.load = (scene, region, url, finishCallback, allCompletedCallback, options) => {
    const path = url.substring(0, url.lastIndexOf("/") + 1);
    const filename = url.substring(url.lastIndexOf("/") + 1, url.length);
    const loader = new GLTFLoader().setPath(path);
    
    loader.load( filename, function ( gltf ) {
      console.log(gltf)
      _this.parseGLTFObjects(gltf.scene, region, 0, finishCallback);
      _this.setCamera(scene);
      if (allCompletedCallback != undefined && (typeof allCompletedCallback == 'function'))
        allCompletedCallback();
    });
  }
}

exports.GLTFToZincJSLoader = GLTFToZincJSLoader;
