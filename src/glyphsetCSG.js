var THREE = require('three');
var ThreeBSP = require('three-js-csg')(THREE);
var Glyphset = require('./glyphset').Glyphset;

/**
 * Provides an object which takes in a glyphset, convert it into a CSG and further
 * action such as intersect with another geometry may be performed.
 * 
 * @class
 * @author Alan Wu
 * @return {GlyphsetCSG}
 */
var GlyphsetCSG = function (hostIn) {
  var host = undefined;
  if (hostIn && hostIn.isGlyphset)
	  host = hostIn;
  var hostCSGs = new Array();
  var currentIntersect = undefined;
  var _this = this;
  
  this.setGlyphset = function(hostIn) {
	  if (hostIn && hostIn.isGlyphset)
		  host = hostIn;
	  hostCSG = undefined;
  }
  
  this.getGlyphset = function() {
	  return host;
  }
  
  var prepareCSGForGlyphs = function() {
	  return function(glyph) {
		  var mesh = glyph.getMesh();
		  var label = glyph.getLabel();
		  var colour = glyph.getColor();
		  if (mesh) {
			  var csg = new ThreeBSP(mesh.geometry.clone().applyMatrix(mesh.matrix));
			  var store = [];
			  store.csg = csg;
			  store.label = label;
			  if (mesh.material)
				  store.material = mesh.material.clone();
			  hostCSGs.push(store);
		  }
	  }
  }
  
  var prepareCSG = function(guestGeometry) {
	  if (host && guestGeometry && guestGeometry.morph) {
	      if (hostCSGs.length == 0) {
	    	  host.forEachGlyph(prepareCSGForGlyphs());
	      }
	     var guestCSG = new ThreeBSP(guestGeometry.morph);
	     return guestCSG;
	  }
	  return undefined;
  }
  
  this.intersect = function(guestGeometry) {
	  var guestCSG = prepareCSG(guestGeometry);
	  if ((hostCSGs.length > 0) && guestCSG) {
		var glyphset = new (require('./glyphset').Glyphset)();
		for (var i = 0; i < hostCSGs.length; i++) {
			var hostCSG = hostCSGs[i];
		    var intersect = hostCSG.csg.intersect(guestCSG);
		    var mesh = intersect.toMesh();
		    if (mesh && mesh.geometry && (mesh.geometry.vertices.length > 0)) {
		    	if (hostCSG.material) {
		    		mesh.material = hostCSG.material;
		    		mesh.material.side = THREE.DoubleSide;
		    		mesh.material.clippingPlanes = null;
		    	}
			    var glyph = glyphset.addMeshAsGlyph(mesh, i+1);
			    glyph.setLabel(hostCSG.label);
		    }
		}
	    var newCSG = new GlyphsetCSG(glyphset);	
	    return newCSG;
	  }

	  return undefined;
  }
  
}

exports.GlyphsetCSG = GlyphsetCSG;
