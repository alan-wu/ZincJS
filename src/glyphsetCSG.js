const THREE = require('three');
const ThreeBSP = require('./three-js-csg')(THREE);
const Glyphset = require('./glyphset').Glyphset;

/**
 * Provides an object which takes in a glyphset, convert it into a CSG and further
 * action such as intersect with another geometry may be performed.
 * 
 * @class
 * @author Alan Wu
 * @return {GlyphsetCSG}
 */
const GlyphsetCSG = function (hostIn) {
  let host = undefined;
  if (hostIn && hostIn.isGlyphset)
	  host = hostIn;
  const hostCSGs = new Array();
  const currentIntersect = undefined;
  
  this.setGlyphset = hostIn => {
	  if (hostIn && hostIn.isGlyphset)
		  host = hostIn;
	  hostCSG = undefined;
  }
  
  this.getGlyphset = () => {
	  return host;
  }
  
  const prepareCSGForGlyphs = () => {
	  return glyph => {
		  const mesh = glyph.getMesh();
		  const label = glyph.getLabel();
		  if (mesh) {
			  const csg = new ThreeBSP(mesh.geometry.clone().applyMatrix(mesh.matrix));
			  const store = [];
			  store.csg = csg;
			  store.label = label;
			  if (mesh.material)
				  store.material = mesh.material.clone();
			  hostCSGs.push(store);
		  }
	  };
  };
  
  const prepareCSG = guestGeometry => {
	  if (host && guestGeometry && guestGeometry.morph) {
	      if (hostCSGs.length == 0) {
	    	  host.forEachGlyph(prepareCSGForGlyphs());
	      }
	     const guestCSG = new ThreeBSP(guestGeometry.morph);
	     return guestCSG;
	  }
	  return undefined;
  };
  
  this.intersect = guestGeometry => {
	  const guestCSG = prepareCSG(guestGeometry);
	  if ((hostCSGs.length > 0) && guestCSG) {
		const glyphset = new (require('./glyphset').Glyphset)();
		for (let i = 0; i < hostCSGs.length; i++) {
			const hostCSG = hostCSGs[i];
		    const intersect = hostCSG.csg.intersect(guestCSG);
		    const mesh = intersect.toMesh();
		    if (mesh && mesh.geometry && (mesh.geometry.vertices.length > 0)) {
		    	if (hostCSG.material) {
		    		mesh.material = hostCSG.material;
		    		mesh.material.side = THREE.DoubleSide;
		    		mesh.material.clippingPlanes = null;
		    	}
			    const glyph = glyphset.addMeshAsGlyph(mesh, i+1);
			    glyph.setLabel(hostCSG.label);
		    }
		}
	    const newCSG = new GlyphsetCSG(glyphset);	
	    return newCSG;
	  }

	  return undefined;
  }
  
};

exports.GlyphsetCSG = GlyphsetCSG;
