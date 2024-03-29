const THREE = require('three');
const ThreeBSP = require('./three-js-csg')(THREE);
const Geometry = require('./primitives/geometry').Geometry;
const work = require('webworkify-webpack');
const Promise = require('promise-polyfill').default;
//const work = undefined;
const JSONLoader = THREE.BufferGeometryLoader;

const GeometryCSG = function (hostIn) {
  //ZincGeoemtry of the main geometry
  let host = undefined;
  if (hostIn && hostIn.isGeometry)
	host = hostIn;
  let core = undefined;
  let worker = undefined;
  let onProgress = false;
  let myResolve = undefined;
  
  var createGeometryFromJSON = json => {
	  const material = host.getMorph().material.clone();
	  material.morphTargets = false;
	  const newGeometry = new Geometry();
		const JSONParser = new JSONLoader();
		const geometry = JSONParser.parse(json);
    const mesh = new THREE.Mesh(geometry.geometry, material);
	  newGeometry.geometry = mesh.geometry;
    mesh.userData = newGeometry;
	  newGeometry.setMorph(mesh);
	  return newGeometry;
  }
  
  var workerEventHandler = ev => {
	  switch (ev.data.action) {
	  	case 'message':
	        console.log(ev.data.message);
	        break;
	  	case 'result':
	    	const csg = new GeometryCSG(createGeometryFromJSON(ev.data.object));
	    	if (myResolve)
	    		myResolve(csg);
	    	myResolve = undefined;
	    	onProgress = false;
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
		  let mesh = hostIn.getMorph();
		  let json = mesh.geometry.clone().applyMatrix(mesh.matrix).toJSON();
		  worker.addEventListener('message', function (ev) {
			  workerEventHandler(ev);
		  });
		  worker.postMessage({action: "initialise", object: json});
		}
	  }
  }
  
  this.getHostGeometry = () => {
	const tempCSG = new ThreeBSP(host.getMorph());
    return new createZincGeometry(tempCSG);
  }
  
  this.getGeometry = () => host;
  
  const createZincGeometry = csgMesh => {
		const material = host.getMorph().material.clone();
		material.morphTargets = false;
		const newMesh = csgMesh.toMesh(material);
	    const newGeometry = new Geometry();
	    newGeometry.geometry = newMesh.geometry;
	    newMesh.userData = newGeometry;
	    newGeometry.setMorph(newMesh);
	    return newGeometry;
  }
  
  this.setCSG = CSG => {
	  core.setCSG(CSG);
  } 
  
  const sendToWork = (guestGeometry, action, resolve, reject) => {
	  if (!onProgress) {
		  let mesh = guestGeometry.getMorph();
		  const json = mesh.geometry.clone().applyMatrix(mesh.matrix).toJSON();
		  myResolve = resolve;
		  onProgress = true;
		  worker.postMessage({action: action, object: json});
	  } else {
		  reject("On progress");
	  }
  }
  
  this.intersect = guestGeometry => {
	  return new Promise((resolve, reject) => {
		  if (worker) {
			  sendToWork(guestGeometry, "intersect", resolve, reject);
		  } else {
			  const result = core.intersect(guestGeometry);
			  const newCSG = new GeometryCSG(createZincGeometry(result));
			  newCSG.setCSG(result);
			  resolve(newCSG);
		  }
	  });
	};
  
  this.subtract = guestGeometry => {
	  return new Promise((resolve, reject) => {
		  if (worker) {
			  sendToWork(guestGeometry, "intersect", resolve, reject);
		  } else {
			  const result = core.subtract(guestGeometry);
			  const newCSG = new GeometryCSG(createZincGeometry(result));
			  newCSG.setCSG(result);
			  resolve(newCSG);
		  }
	  });
  }
  
  this.union = guestGeometry => {
	  return new Promise((resolve, reject) => {
		  if (worker) {
			  sendToWork(guestGeometry, "intersect", resolve, reject);
		  } else {
			  const result = core.union(guestGeometry);
			  const newCSG = new GeometryCSG(createZincGeometry(result));
			  newCSG.setCSG(result);
			  resolve(newCSG);
		  }
	  });
  }
  
  this.terminateWorker = () => {
	  if (worker)
		  worker.terminate();
  }
  
  initialise(hostIn);
};

exports.GeometryCSG = GeometryCSG;
