var THREE = require('three');
var ThreeBSP = require('three-js-csg')(THREE);

exports.GeometryCSG = function (hostIn) {
  //ZincGeoemtry of the main geometry
  var host = hostIn;
  var hostCSG = undefined;
  var result = undefined;
  var resultCSG = undefined;
  var mode = undefined;
  var _this = this;
  
  this.updateGeometry = function(hostIn) {
    host = hostIn;
    hostCSG = undefined;
  }
  
  var createZincGeometry = function(meshIn) {
    var newGeometry = new (require('./geometry').Geometry)();
    newGeometry.geometry = meshIn.geometry;
    newGeometry.morph = meshIn;
    newGeometry.morph.userData = newGeometry;
    return newGeometry;
  }
  
  this.intersect = function(guestGeometry) {
    if (host && host.morph && guestGeometry && guestGeometry.morph) {
      if (hostCSG === undefined)
        hostCSG = new ThreeBSP(host.morph);
      var guestCSG = new ThreeBSP(guestGeometry.morph);
      if (hostCSG && guestCSG) {
        var intersect = hostCSG.intersect(guestCSG);
        var material = host.morph.material.clone();
        material.morphTargets = false;
        var newMesh = intersect.toMesh(material);
        return createZincGeometry(newMesh);
      }
    }
    return undefined;
  }
}
