const THREE = require('three');
const ThreeBSP = require('three-js-csg')(THREE);
const Geometry = require('./geometry').Geometry;
//const work = require('webworkify-webpack');
const work = undefined;
const JSONLoader = require('./loader').JSONLoader;

const GeometryCSG = function (hostIn) {
  //ZincGeoemtry of the main geometry
  let host = undefined;
  if (hostIn && hostIn.isGeometry)
	host = hostIn;
  let core = undefined;
  let worker = undefined;
  let onProgress = false;
  
  var createGeometryFromJSON = json => {
	  	const material = host.morph.material.clone();
	  	material.morphTargets = false;
	    const newGeometry = new Geometry();
		const JSONParser = new JSONLoader();
		const geometry = JSONParser.parse(json);
        const mesh = new THREE.Mesh(geometry.geometry, material);
	    newGeometry.geometry = mesh.geometry;
	    newGeometry.morph = mesh;
	    newGeometry.morph.userData = newGeometry;
	    return newGeometry;
  }
  
  var workerEventHandler = ev => {
	  switch (ev.data.action) {
	  	case 'message':
	        console.log(ev.data.message);
	        break;
	  	case 'result':
	    	const csg = new GeometryCSG(createGeometryFromJSON(ev.data.object));
	    	return csg;
	        break;
	  	default:
	    	throw 'Cannot handle specified action.';
    }
  }
    
  var initialise = hostIn => {
	  if (work !== undefined) {
		worker = work(require.resolve('./workers/geometryCSG.worker.js'));
	  }
	  if (!worker) {
	    core = new (require('./workers/geometryCSGInternal').GeometryCSGInternal)(hostIn);
	  } else {
		if (hostIn && hostIn.isGeometry) {
		  let mesh = hostIn.morph;
		  let json = mesh.geometry.clone().applyMatrix(mesh.matrix).toJSON();
		  worker.addEventListener('message', function (ev) {
			  workerEventHandler(ev);
		  });
		  worker.postMessage({action: "initialise", object: json});
		}
	  }
  }
  
  this.getHostGeometry = () => {
	const tempCSG = new ThreeBSP(host.morph);
    return new createZincGeometry(tempCSG);
  }
  
  this.getGeometry = () => host;
  
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
  
  this.setCSG = CSG => {
	  core.setCSG(CSG);
  } 
  
  this.intersect = guestGeometry => {
	  if (worker) {
		  let mesh = guestGeometry.morph;
		  const json = mesh.geometry.clone().applyMatrix(mesh.matrix).toJSON();
		  onProgress = true;
		  worker.postMessage({action: "intersect", object: json});
	  } else {
		  const result = core.intersect(guestGeometry);
		  const newCSG = new GeometryCSG(createZincGeometry(result));
		  newCSG.setCSG(result);
		  return newCSG;
	  }
  }
  
  this.subtract = guestGeometry => {
	  if (worker) {
		  let mesh = guestGeometry.morph;
		  let json = mesh.geometry.clone().applyMatrix(mesh.matrix).toJSON();
		  onProgress = true;
		  worker.postMessage({action: "subtract", object: json});
	  } else {
		  const result = core.subtract(guestGeometry);
		  const newCSG = new GeometryCSG(createZincGeometry(result));
		  newCSG.setCSG(result);
		  return newCSG;
	  }
  }
  
  this.union = guestGeometry => {
	  if (worker) {
		  let mesh = guestGeometry.morph;
		  let json = mesh.geometry.clone().applyMatrix(mesh.matrix).toJSON();
		  onProgress = true;
		  worker.postMessage({action: "union", object: json});
	  } else {
		  const result = core.union(guestGeometry);
		  const newCSG = new GeometryCSG(createZincGeometry(result));
		  newCSG.setCSG(result);
		  return newCSG;
	  }
  }
  
  initialise(hostIn);
};

exports.GeometryCSG = GeometryCSG;
