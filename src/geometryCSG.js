var THREE = require('three');
var ThreeBSP = require('three-js-csg')(THREE);
var Geometry = require('./geometry').Geometry;

var GeometryCSG = function (hostIn) {
  //ZincGeoemtry of the main geometry
  if (hostIn && hostIn.isGeometry)
    host = hostIn;
  var host = hostIn;
  var hostCSG = undefined;
  var _this = this;
  
  this.setGeometry = function(hostIn) {
    if (hostIn && hostIn.isGeometry)
	  host = hostIn;
    hostCSG = undefined;
  }
  
  this.getHostGeometry = function() {
	var tempCSG = new ThreeBSP(host.morph);
    return new createZincGeometry(tempCSG);
  }
  
  this.getGeometry = function() {
	  return host;
  }
  
  var createZincGeometry = function(csgMesh) {
	var material = host.morph.material.clone();
	material.morphTargets = false;
	var newMesh = csgMesh.toMesh(material);
    var newGeometry = new Geometry();
    newGeometry.geometry = newMesh.geometry;
    newGeometry.morph = newMesh;
    newGeometry.morph.userData = newGeometry;
    return newGeometry;
  }
  
  var prepareCSG = function(guestGeometry) {
	  if (host && host.morph && guestGeometry && guestGeometry.morph) {
	      if (hostCSG === undefined)
	        hostCSG = new ThreeBSP(host.morph);
	      var guestCSG = new ThreeBSP(guestGeometry.morph);
	      return guestCSG;
	  }
	  return undefined;
  }
  
  this.intersect = function(guestGeometry) {
	  var guestCSG = prepareCSG(guestGeometry);
	  if (hostCSG && guestCSG) {
	    var intersect = hostCSG.intersect(guestCSG);
	    var newCSG = new GeometryCSG(createZincGeometry(intersect));
	    newCSG.setCSG(intersect);
	    return newCSG;
	  }
	  return undefined;
  }
  
  this.setCSG = function(csg) {
	  if (hostCSG === undefined)
		  hostCSG = csg;
  }
  
  this.subtract = function(guestGeometry) {
	  var guestCSG = prepareCSG(guestGeometry);
	  if (hostCSG && guestCSG) {
		  var intersect = hostCSG.subtract(guestCSG);
		  var newCSG = new GeometryCSG(createZincGeometry(intersect));
		  newCSG.setCSG(intersect);
		  return newCSG;
	  }
	  return undefined;
  }
  
  this.union = function(guestGeometry) {
	  var guestCSG = prepareCSG(guestGeometry);
	  if (hostCSG && guestCSG) {
		  var intersect = hostCSG.union(guestCSG);
		  var newCSG = new GeometryCSG(createZincGeometry(intersect));
		  newCSG.setCSG(intersect);
		  return newCSG;
	  }
	  return undefined;
  }
}

exports.GeometryCSG = GeometryCSG;
