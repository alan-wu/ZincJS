import * as THREE from 'three/webgpu';
import { ThreeBSPWrapper } from '../three-js-csg';
const ThreeBSP = ThreeBSPWrapper(THREE);


const GeometryCSGInternal = function (hostIn) {
  //ZincGeoemtry of the main geometry
  let host = undefined;
  if (hostIn && hostIn.isGeometry)
    host = hostIn;
  let hostCSG = undefined;

  this.setGeometry = hostIn => {
    if (hostIn && hostIn.isGeometry)
	  host = hostIn;
    hostCSG = undefined;
  }

  this.setCSG = csg => {
	  hostCSG = csg;
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
	    return hostCSG.intersect(guestCSG);
	  }
	  return undefined;
  }

  this.subtract = guestGeometry => {
	  const guestCSG = prepareCSG(guestGeometry);
	  if (hostCSG && guestCSG) {
		  return hostCSG.subtract(guestCSG);
	  }
	  return undefined;
  }

  this.union = guestGeometry => {
	  const guestCSG = prepareCSG(guestGeometry);
	  if (hostCSG && guestCSG) {
		  return hostCSG.union(guestCSG);
	  }
	  return undefined;
  }
};

export { GeometryCSGInternal };

