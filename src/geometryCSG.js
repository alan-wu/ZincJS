const THREE = require('three');
const ThreeBSP = require('three-js-csg')(THREE);
const Geometry = require('./geometry').Geometry;

const GeometryCSG = function (hostIn) {
  //ZincGeoemtry of the main geometry
  let host = undefined;
  if (hostIn && hostIn.isGeometry)
    host = hostIn;
  let hostCSG = undefined;
  const _this = this;
  
  this.setGeometry = hostIn => {
    if (hostIn && hostIn.isGeometry)
	  host = hostIn;
    hostCSG = undefined;
  }
  
  this.getHostGeometry = () => {
	const tempCSG = new ThreeBSP(host.morph);
    return new createZincGeometry(tempCSG);
  }
  
  this.getGeometry = () => {
	  return host;
  }
  
  const createZincGeometry = csgMesh => {
	const material = host.morph.material.clone();
	material.morphTargets = false;
	const newMesh = csgMesh.toMesh(material);
    const newGeometry = new Geometry();
    newGeometry.geometry = newMesh.geometry;
    newGeometry.morph = newMesh;
    newGeometry.morph.userData = newGeometry;
    return newGeometry;
  }
  
  const prepareCSG = guestGeometry => {
	  if (host && host.morph && guestGeometry && guestGeometry.morph) {
	      if (hostCSG === undefined)
	        hostCSG = new ThreeBSP(host.morph);
	      const guestCSG = new ThreeBSP(guestGeometry.morph);
	      return guestCSG;
	  }
	  return undefined;
  };
  
  this.intersect = guestGeometry => {
	  const guestCSG = prepareCSG(guestGeometry);
	  if (hostCSG && guestCSG) {
	    const intersect = hostCSG.intersect(guestCSG);
	    const newCSG = new GeometryCSG(createZincGeometry(intersect));
	    newCSG.setCSG(intersect);
	    return newCSG;
	  }
	  return undefined;
  }
  
  this.setCSG = csg => {
	  if (hostCSG === undefined)
		  hostCSG = csg;
  }
  
  this.subtract = guestGeometry => {
	  const guestCSG = prepareCSG(guestGeometry);
	  if (hostCSG && guestCSG) {
		  const intersect = hostCSG.subtract(guestCSG);
		  const newCSG = new GeometryCSG(createZincGeometry(intersect));
		  newCSG.setCSG(intersect);
		  return newCSG;
	  }
	  return undefined;
  }
  
  this.union = guestGeometry => {
	  const guestCSG = prepareCSG(guestGeometry);
	  if (hostCSG && guestCSG) {
		  const intersect = hostCSG.union(guestCSG);
		  const newCSG = new GeometryCSG(createZincGeometry(intersect));
		  newCSG.setCSG(intersect);
		  return newCSG;
	  }
	  return undefined;
  }
};

exports.GeometryCSG = GeometryCSG;
