var Zinc = require("../../src/zinc");
const path = require("path");
var assert = require('chai').assert;
var expect = require('chai').expect;
const nock = require('nock');
var THREE= Zinc.THREE;
var fs = require('file-system');
const container = window.document.querySelector("#container");
var geometryCount = 0;

var testBoxGeometry = new THREE.BoxGeometry( 10, 10, 10 );

var preRenderCallback = function() {
  return function() {
    it('PreRenderCallbackFunction',function() 
      {assert.isTrue(true, 'PreRenderCallbackFunction is successfully called');}
    );
  }
}

var metaDataReadCallback = function(done) {
  return function(geometry) {
    it('Geometry is read successfully', function() {
      assert.isObject(geometry, 'geometry has been read');
      done();
    });
  }
}

var geometryCallback = function() {
  return function(geometry) {
    assert.isObject(geometry, 'geometry has been read'); 
    geometryCount = geometryCount + 1;
  }
}

function checkControls(scene) {
  describe('Controls()', function(){
    var controls = undefined;
    before('Get Camera Controls', function() {
      controls = scene.getZincCameraControls();
      assert.isObject(controls, 'controls is available');
    });
    describe('Local Variables()', function(){
      it('cameraObject', function(){
        assert.isObject(controls.cameraObject, 'cameraObject is an object');
      });
      //it('domElement', function(){
      //  assert.isObject(controls.domElement, 'domElement is an object');
      //});
      it('renderer', function(){
        assert.isObject(controls.renderer, 'renderer is an object');
      });
      it('scene', function(){
        assert.isObject(controls.scene, 'renderer is an object');
      });
      it('tumble_rate', function(){
        assert.equal(controls.tumble_rate, 1.5, 'tumble_rate is correct');
      });
      it('scrollRate', function(){
        assert.equal(controls.scrollRate, 50, 'scrollRate is correct');
      });
    });
    describe('Methods()', function(){
      before('Setup Mock response', function() {
        var scope = nock('https://www.mytestserver.com')
          .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
          .get(function(uri) {
            return uri;
          })
          .reply(200, (uri, requestBody, cb) => {console.log(uri);fs.readFile("." + uri, cb)});
      });
      it('setMouseButtonAction', function(){
        assert.isUndefined(controls.setMouseButtonAction("AUXILIARY", "ZOOM"), 'setMouseButtonAction is successfully called');
      });
      it('updateDirectionalLight', function(){
        assert.isUndefined(controls.updateDirectionalLight(), 'updateDirectionalLight is successfully called');
      });
      it('disable', function(){
        assert.isUndefined(controls.updateDirectionalLight(), 'disable is successfully called');
      });
      it('enable', function(){
        assert.isUndefined(controls.enable(""), 'enable is successfully called');
      });
      it('setPathDuration', function(){
        assert.isUndefined(controls.setPathDuration(2000), 'setPathDuration is successfully called');
      });
      it('setTime', function(){
        assert.isUndefined(controls.setTime(1000), 'setTime is successfully called');
      });
      it('setPlayRate', function(){
        assert.isUndefined(controls.setPlayRate(200), 'setPlayRate is successfully called');
      });
      it('loadPathURL', function(done){
        assert.isUndefined(controls.loadPathURL('https://www.mytestserver.com/models/test_path.json', done),
        'loadPathURL is successfully called');
      });
      it('getNumberOfTimeFrame', function(){
        assert.equal(controls.getNumberOfTimeFrame(), 8135, 'getNumberOfTimeFrame returns the correct value');
      });
      it('getCurrentTimeFrame', function(){
        assert.equal(controls.getCurrentTimeFrame()[0], 4067, 'getCurrentTimeFrame returns the correct value');
      });
      it('setCurrentTimeFrame', function(){
        assert.isUndefined(controls.setCurrentTimeFrame(4110), 'setCurrentTimeFrame is successfully called');
        assert.equal(controls.getCurrentTimeFrame()[0], 4110, 'getCurrentTimeFrame returns the correct value');
      });
      it('playPath', function(){
        assert.isUndefined(controls.playPath(), 'playPath is successfully called');
        assert.isTrue(controls.isPlayingPath(), 'Playing path');
      });
      it('update', function(){
        assert.isUndefined(controls.update(1), 'update is successfully called');
        assert.equal(controls.getCurrentTimeFrame()[0], 4923, 'getCurrentTimeFrame returns the correct value');
      });
      it('stopPath', function(){
        assert.isUndefined(controls.stopPath(), 'stopPath is successfully called');
        assert.isFalse(controls.isPlayingPath(), 'Stop playing path');
      });
      it('enableDirectionalLightUpdateWithPath', function(){
        assert.isUndefined(controls.enableDirectionalLightUpdateWithPath(true),
          'enableDirectionalLightUpdateWithPath is successfully called');
      });
      it('enableDeviceOrientation', function(){
        assert.isUndefined(controls.enableDeviceOrientation(), 'enableDeviceOrientation is successfully called');
        assert.isTrue(controls.isDeviceOrientationEnabled(), 'Device Orientation is correctly enabled');
      });
      it('disableDeviceOrientation', function(){
        assert.isUndefined(controls.disableDeviceOrientation(), 'disableDeviceOrientation is successfully called');
        assert.isFalse(controls.isDeviceOrientationEnabled(), 'Device Orientation is correctly disable');
      });
      it('getViewportFromCentreAndRadius', function(){
        var viewport = controls.getViewportFromCentreAndRadius(10,20,30, 30, 40, 100);
        assert.isObject(viewport, 'getViewportFromCentreAndRadius successfully returns an object');
      });
      it('getDefaultViewport', function(){
        var viewport = controls.getDefaultViewport();
        assert.isObject(viewport, 'getDefaultViewport successfully returns an object');
      });
      it('getCurrentViewport', function() {
        var viewport = controls.getCurrentViewport();
        assert.isObject(viewport, 'getCurrentViewport successfully returns an object');
      });
      it('setDefaultCameraSettings', function(){
        var viewport = controls.getViewportFromCentreAndRadius(10,20,30, 30, 40, 100);
        assert.isObject(viewport, 'getViewportFromCentreAndRadius successfully returns an object');
        assert.isUndefined(controls.setDefaultCameraSettings(viewport), 'setDefaultCameraSettings  successfully called');
        assert.equal(viewport.eyePosition[0], controls.getDefaultViewport().eyePosition[0], 'Default camera settings are set correctly');
      });
      it('setCurrentCameraSettings', function(){
        var viewport = controls.getViewportFromCentreAndRadius(10,20,30, 30, 40, 100);
        assert.isObject(viewport, 'getViewportFromCentreAndRadius successfully returns an object');
        assert.isUndefined(controls.setCurrentCameraSettings(viewport), 'setCurrentCameraSettings is successfully called');
        assert.equal(viewport.eyePosition[0], controls.getCurrentViewport().eyePosition[0], 'Current camera settings are set correctly');
      });
      it('resetView', function(){
        assert.isUndefined(controls.resetView(), 'resetView is successfully called');
      });
      it('cameraTransition', function(){
        var startingViewport = controls.getViewportFromCentreAndRadius(10,20,30, 30, 40, 100);
        var endingViewport = controls.getViewportFromCentreAndRadius(20,40,60, 60, 80, 200);
        assert.isUndefined(controls.cameraTransition(startingViewport, endingViewport, 2000), 
            'cameraTransition is successfully called');
      });
      it('enableCameraTransition', function(){
        assert.isUndefined(controls.enableCameraTransition(), 'enableCameraTransition is successfully called');
        assert.isTrue(controls.isTransitioningCamera(), 'camera transition is successfully enabled');
      });
      it('pauseCameraTransition', function(){
        assert.isUndefined(controls.pauseCameraTransition(), 'pauseCameraTransition is successfully called');
        assert.isFalse(controls.isTransitioningCamera(), 'camera transition is successfully paused');
      });
      it('stopCameraTransition', function(){
        assert.isUndefined(controls.stopCameraTransition(), 'stopCameraTransition is successfully called');
        assert.isFalse(controls.isTransitioningCamera(), 'camera transition is successfully stopped');
      });
      it('autoTumble', function(){
        assert.isUndefined(controls.autoTumble([1.0, 0.0], 0.01, true), 'autoTumble is successfully called');
      });
      it('enableAutoTumble', function(){
        assert.isUndefined(controls.enableAutoTumble(), 'enableAutoTumble is successfully called');
        assert.isTrue(controls.isAutoTumble(), 'auto tumble is successfully enabled');
      });
      it('updateAutoTumble', function(){
        assert.isUndefined(controls.updateAutoTumble(), 'updateAutoTumble is successfully called');
      });
      it('stopAutoTumble', function(){
        assert.isUndefined(controls.stopAutoTumble(), 'stopAutoTumble is successfully called');
        assert.isFalse(controls.isAutoTumble(), 'auto tumble is successfully stopped');
      });
      it('enableRaycaster', function(){
        assert.isUndefined(controls.enableRaycaster(scene, undefined, undefined), 'enableRaycaster is successfully called');
      });
      it('disableRaycaster', function(){
        assert.isUndefined(controls.disableRaycaster(), 'disableRaycaster is successfully called');
      });
    });
  });
}

function checkGeometry(scene) {
  describe('Geometry()', function(){
    var geometry = undefined;
    var id = 4001;
    before('New Zinc Geometry', function() {
      geometry = scene.addZincGeometry(testBoxGeometry, id, 0x00ff00, 1.0, false, false);
      geometry.groupName = "TestGeometry";
      assert.isObject(geometry, 'ZincGeometry has been created');
      assert.equal(geometry.groupName, "TestGeometry", 'ZincGeometry group name has been set');
    });
    describe('Local Variables()', function(){
      it('geometry', function(){
        assert.isObject(geometry.geometry, 'geometry is an object');
      });
      it('mixer', function(){
        assert.isObject(geometry.mixer, 'mixer is an object');
      });
      it('timeEnabled', function(){
        assert.isFalse(geometry.timeEnabled, 'timeEnabled is false');
      });
      it('morphColour', function(){
        assert.isFalse(geometry.morphColour, 'morphColour is an object');
      });
      it('modelId', function(){
        assert.equal(geometry.modelId, id, 'modelId is correct');
      });
      it('morph', function(){
        assert.isObject(geometry.morph, 'morph is an object');
      });
      it('clipAction', function(){
        assert.isUndefined(geometry.clipAction, 'clipAction is an object');
      });
      it('groupName', function(){
        assert.equal(geometry.groupName, "TestGeometry", 'groupName is correct');
      });
    });
    describe('Methods()', function(){
      it('setVisibility', function() {
        assert.isUndefined(geometry.setVisibility(false), 'setVisibility is successfully called');
        assert.isFalse(geometry.morph.visible, 'visibility is false');
      });
      it('setAlpha', function() {
        assert.isUndefined(geometry.setAlpha(0.5), 'setAlpha is successfully called');
        assert.isTrue(geometry.morph.material.transparent, 'transparent is true');
        assert.equal(geometry.morph.material.opacity, 0.5, 'opacity is correct');
      });
      it('getCurrentTime', function() {
        assert.equal(geometry.getCurrentTime(), 0.0, 'getCurrentTime returns the correct value');
      });
      it('setMorphTime', function() {
        assert.isUndefined(geometry.setMorphTime(1500), 'setMorphTime is successfully called');
        assert.equal(geometry.getCurrentTime(), 1500.0, 'getCurrentTime returns the correct value');
      });
      it('setWireframe', function() {
        assert.isUndefined(geometry.setWireframe(true), 'setWireframe is successfully called');
        assert.isTrue(geometry.morph.material.wireframe , 'wireframe is correct');
      });
      it('setColour', function() {
        assert.isUndefined(geometry.setColour(0x888888), 'setColour is successfully called');
        assert.equal(geometry.morph.material.color , 0x888888, 'colour is correct');
      });
      it('setVertexColour', function() {
        assert.isUndefined(geometry.setVertexColors(THREE.NoColors), 'setVertexColour is successfully called');
        assert.equal(geometry.morph.material.vertexColors , THREE.NoColors, 'colour is correct');
      });
      it('getBoundingBox', function() {
        var boundingBox = geometry.getBoundingBox();
        assert.isObject(boundingBox, 'boundingBox is successfully called');
        assert.isObject(boundingBox.min,'boundingbox`s min is alright');
        assert.isObject(boundingBox.max, 'boundingbox`s max is alright');
      });
      it('setMaterial', function() {
        var material = new THREE.MeshBasicMaterial( {
          color: 0x000000
        } );
        assert.isUndefined(geometry.setMaterial(material), 'setMaterial is successfully called');;
        assert.equal(geometry.morph.material, material, 'material is correct');
      });
      it('render', function() {
        assert.isUndefined(geometry.render(100, true), 'render is successfully called');
      });
    });
  });
}

function checkLines(lines) {
  describe('Lines()', function(){
    describe('Local Variables()', function(){
      it('lines', function(){
        assert.isObject(lines.morph, 'geometry is an object');
      });
      it('timeEnabled', function(){
        assert.isTrue(lines.timeEnabled, 'timeEnabled is true');
      });
      it('morphColour', function(){
        assert.isFalse(lines.morphColour, 'morphColour is false');
      });
      it('clipAction', function(){
        assert.isObject(lines.clipAction, 'clipAction is an object');
      });
      it('groupName', function(){
        assert.equal(lines.groupName, "test lines", 'groupName is correct');
      });
    });
    describe('Methods()', function(){
      it('setMorphTime', function() {
        assert.isUndefined(lines.setMorphTime(1500), 'setMorphTime is successfully called');
      });
      it('getCurrentTime', function() {
        assert.equal(lines.getCurrentTime(), 1500.0, 'getCurrentTime returns the correct value');
      });
      it('getBoundingBox', function() {
        var boundingBox = lines.getBoundingBox();
        assert.isObject(boundingBox, 'boundingBox is successfully called');
        assert.isObject(boundingBox.min,'boundingbox`s min is alright');
        assert.isObject(boundingBox.max, 'boundingbox`s max is alright');
      });
      it('setName', function() {
        assert.isUndefined(lines.setName("lines1"), 'setName is successfully called');
        assert.equal(lines.groupName, 'lines1', 'name is correctly set');
      });
      it('setVisibility', function() {
        assert.isUndefined(lines.setVisibility(false), 'setVisibility is successfully called');
      });
      it('setWidth', function() {
        assert.isUndefined(lines.setWidth(3), 'setWidth is successfully called');
        assert.equal(lines.morph.material.linewidth, 3.0, 'setWidth sets the correct value');
      });
      it('isTimeVarying', function() {
        assert.isTrue(lines.isTimeVarying(), 'isTimeVarying is true');
      });
      it('render', function() {
        assert.isUndefined(lines.render(100, true), 'render is successfully called');
      });
    });
  });
}

function checkScene(renderer) {
  var testScene = undefined;
  describe('Scene()', function(){
    var scene = renderer.createScene("TestScene");
    testScene = scene;
    it('New scene object', function(){
      assert.isObject(scene, 'Scene has been created');
    });
    var returnedValue = renderer.setCurrentScene(scene);
    it('Set as current scene', function(){
      assert.isUndefined(returnedValue, 'Scene has been set correctly');
    });
    describe('Local Variables()', function(){
      it('autoClearFlag', function(){
        assert.isTrue(scene.autoClearFlag, 'autoClearFlag equals `false`');
      });
    });
    describe('Methods()', function(){
      var testGeometry = undefined;
      var id = 3001;
      this.timeout(5000); 
      before('addZincGeometry', function() {
        testGeometry = scene.addZincGeometry(testBoxGeometry, id, 0x00ff00, 1.0, false, false);
        testGeometry.groupName = "TestGeometry";
        assert.isObject(testGeometry, 'ZincGeometry has been created');
        assert.equal(testGeometry.groupName, "TestGeometry", 'ZincGeometry group name has been set');
      });
      before('Setup Mock response', function() {
        var scope = nock('https://www.mytestserver.com')
          .persist()
          .defaultReplyHeaders({ 'access-control-allow-origin': '*' })
          .get(function(uri) {
            return uri;
          })
          .reply(200, (uri, requestBody, cb) => {fs.readFile("." + uri, cb)}, {'Content-Type': 'application/json'});

      });
      it('loadView', function() {
        scene.loadViewURL("https://www.mytestserver.com/models/test_view.json");
      });
      it('loadMetadataURL', function(done) {
        scene.loadMetadataURL("https://www.mytestserver.com/models/test_metadata.json", undefined, done);
      });
      it('onWindowResize', function(){
        assert.isUndefined(scene.onWindowResize(), 'onWindowResize is successfully called');
      });
      it('resetView', function(){
        assert.isUndefined(scene.resetView(), 'resetView is successfully called');
      });
      it('viewAll', function(){
        assert.isUndefined(scene.viewAll(), 'viewAll is successfully called');
      });
      it('getBoundingBox', function() {
        var boundingBox = scene.getBoundingBox();
        assert.isObject(boundingBox, 'boundingBox is successfully called');
        assert.isObject(boundingBox.min,'boundingbox`s min is alright');
        assert.isObject(boundingBox.max, 'boundingbox`s max is alright');
      });
      it('viewAllWithBoundingBox', function() {
        var boundingBox = scene.getBoundingBox();
        assert.isUndefined(scene.viewAllWithBoundingBox(boundingBox), 'viewAllWithBoundingBox is successfully called');
      });
      it ('forEachGeometry', function() {
        scene.forEachGeometry(geometryCallback());
        assert.equal(3, geometryCount, 'forEachGeometry is called successfully.')
      });
      it ('findGeometriesWithGroupName', function() {
        assert.lengthOf(scene.findGeometriesWithGroupName("TestGeometry"), 1, 'findGeometriesWithGroupName returns 1 geometry');
      });
      it ('findGlyphsetsWithGroupName', function() {
        assert.lengthOf(scene.findGlyphsetsWithGroupName("test glyph"), 1, 'findGlyphsetsWithGroupName returns 1 glyphset');
      });
      it ('findLinesWithGroupName', function() {
        var lines = scene.findLinesWithGroupName("test lines");
        assert.lengthOf(lines, 1, 'findLinesWithGroupName returns 1 glyphset');
        checkLines(lines[0]);
      });
      it ('findPointsetsWithGroupName', function() {
        assert.lengthOf(scene.findPointsetsWithGroupName("test point"), 1, 'findPointsetsWithGroupName returns 1 point');
      });
      it('updateDirectionalLight', function(){
        assert.isUndefined(scene.updateDirectionalLight(), 'updateDirectionalLight is successfully called');
      });
      it('getCurrentTime', function(){
        assert.equal(scene.getCurrentTime(), 0.0, 'getCurrentTime is successfully called');
      });
      it('setMorphsTime', function(){
        assert.isUndefined(scene.setMorphsTime(1000.0), 'setMorphsTime is successfully called');
      });
      it('getZincGeometryByID', function(){
        assert.equal(scene.getZincGeometryByID(id), testGeometry, 'getZincGeometryByID returns the correct object');
      });
      it('getZincCameraControls', function() {
        assert.isObject(scene.getZincCameraControls(), 'getZincCameraControls returns the correct object');
      });
      it('getThreeJSScene', function(){
        assert.isObject(scene.getThreeJSScene(), 'getThreeJSScene returns the correct object');
      });
      it('setInteractiveControlEnable', function(){
        assert.isUndefined(scene.setInteractiveControlEnable(true), 'setInteractiveControlEnable is successfully called');
      });
      it('setStereoEffectEnable', function(){
        assert.isUndefined(scene.setStereoEffectEnable(true), 'setStereoEffectEnable is successfully called');
      });
      it('isStereoEffectEnable', function(){
        assert.isTrue(scene.isStereoEffectEnable(), 'setStereoEffectEnable is successfully called');
      });
      it('removeZincGeometry', function(){
        assert.isUndefined(scene.removeZincGeometry(testGeometry), 'removeZincGeometry is successfully called');
      });
      it('getZincGeometryByID', function(){
        assert.isNull(scene.getZincGeometryByID(id), 'getZincGeometryByID returns the correct object');
      });
    });

  });
  return testScene;
}

function checkRenderer() {
  var testRenderer;
  describe('Renderer()', function(){
    it('Renderer is a valid constructor', function(){
      assert.isFunction(Zinc.Renderer, 'Zinc.Renderer is a valid constructor'); 
    });
    var renderer = new Zinc.Renderer(container, window);
    it('Renderer creates an object', function(){
      assert.isObject(renderer, 'Zinc.Renderer creates an object'); 
    });
    describe('Local Variables()', function(){
      it('playAnimation', function(){
        assert.equal(renderer.playAnimation, true, 'playAnimation equals `true`');
      });
    })
    describe('Methods()', function(){
      var parameters = {};
      var context = require("gl")(1024, 1024);
      parameters['context'] = context;
      var returnValue = renderer.initialiseVisualisation(parameters);
      it('initialiseVisualisation', function(){
        assert.isUndefined(returnValue, 'initialiseVisualisation is successfully called');
      });
      it('getCurrentScene', function(){
        assert.isObject(renderer.getCurrentScene(), 'getCurrentScene returns an object');
      });
      var scene = renderer.createScene("Test1");
      it('createScene', function(){
        assert.isObject(scene, 'createScene returns an object');
      });
      it('getSceneByName', function(){
        assert.isObject(renderer.getSceneByName("Test1"), 'getSceneByName returns an object');
      });
      it('setCurrentScene', function(){
        assert.isUndefined(renderer.setCurrentScene(scene), 'setCurrentScene is successfully called');
      });
      it('resetView', function(){
        assert.isUndefined(renderer.resetView(), 'resetView is successfully called');
      });
      it('viewAll', function(){
        assert.isUndefined(renderer.viewAll(), 'viewAll is successfully called');
      });
      it('updateDirectionalLight', function(){
        assert.isUndefined(renderer.updateDirectionalLight(), 'updateDirectionalLight is successfully called');
      });
      it('getPlayRate', function(){
        assert.equal(renderer.getPlayRate(), 500, 'getPlayRate succesfully returns the correct value');
      });
      var callbackId =  renderer.addPreRenderCallbackFunction(preRenderCallback());
      it('addPreRenderCallbackFunction', function(){
        assert.isNumber(callbackId, 'addPreRenderCallbackFunction succesfully returns the correct value');
      });

      it('setPlayRate', function(){
        assert.isUndefined(renderer.setPlayRate(300), 'setPlayRate succesfully returns the correct value');
      });
      it('getCurrentTime', function(){
        assert.equal(renderer.getCurrentTime(), 0, 'getCurrentTime succesfully returns the correct value');
      });
      it('setMorphsTime', function(){
        assert.isUndefined(renderer.setMorphsTime(300), 'setMorphsTime succesfully returns the correct value');
      });
      var  returnValue2 = renderer.render();
      it('render', function(){
        assert.isUndefined(returnValue2, 'render succesfully returns the correct value');
      });
      it('removePreRenderCallbackFunction', function(){
        assert.isUndefined(renderer.removePreRenderCallbackFunction(callbackId),
            'removePreRenderCallbackFunction succesfully is successfully called');
      });
      it('getThreeJSRenderer', function(){
        assert.isObject(renderer.getThreeJSRenderer(), 'getThreeJSRenderer returns an object');
      });
      var scene2 = renderer.createScene("Test2");
      it('isSceneActive', function() {
        assert.isFalse(renderer.isSceneActive(scene2), 'isSceneActive succcessfully returns fail value');
      });
      it('addActiveScene', function() {
        assert.isUndefined(renderer.addActiveScene(scene2), 'addActiveScene is successfully called');
      });
      it('isSceneActive', function() {
        assert.isTrue(renderer.isSceneActive(scene2), 'isSceneActive successfully returns correct value');
      });
      it('removeActiveScene', function() {
        assert.isUndefined(renderer.removeActiveScene(scene2), 'removeActiveScene is successfully called');
      });
      it('isSceneActive', function() {
        assert.isFalse(renderer.isSceneActive(scene2), 'isSceneActive succcessfully returns fail value');
      });
      it('clearAllActiveScene', function() {
        assert.isUndefined(renderer.clearAllActiveScene(), 'clearAllActiveScene is successfully called');
      });
      it('clearAllActiveScene', function() {
        assert.isUndefined(renderer.clearAllActiveScene(), 'clearAllActiveScene is successfully called');
      });
      it('transitionScene', function() {
        assert.isUndefined(renderer.transitionScene(scene2, 3000), 'transitionScene is successfully called');
      });
    })
    testRenderer = renderer;
  })
  var testScene = checkScene(testRenderer);
  checkGeometry(testScene);
  checkControls(testScene);
}

function checkZincObject() {
  it('Zinc is a valid object', function(){
    assert.isObject(Zinc, 'Zinc is an object'); 
  });
  checkRenderer();
}

describe('Zinc', function(){
  checkZincObject();
})
