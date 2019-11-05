const Geometry = require('../geometry').Geometry;
const THREE = require('three');
const JSONLoader = THREE.BufferGeometryLoader;

module.exports = function (self) {
	let core = undefined;
	
	var geometryFromJSON = function(object) {
		var JSONParser = new JSONLoader();
		var geometry = JSONParser.parse(object);
		var material = new THREE.MeshPhongMaterial();
        var mesh = new THREE.Mesh(geometry.geometry, material);
        var host = new Geometry();
        host.morph = mesh;
        return host;
	}

	var initialise = function(object) {
		var host = geometryFromJSON(object);
		core = new (require('./geometryCSGInternal').GeometryCSGInternal)(host);
		self.postMessage({action:"message", message: "Initialised"});
	}
	
	var intersect = function(object) {
		if (core) {
			var guest = geometryFromJSON(object);
			var result = core.intersect(guest);
			var json = result.toBufferGeometry().toJSON();
			self.postMessage({action: "result", object: json});
		}
	}
	
	var subtract = function(object) {
		if (core) {
			var guest = geometryFromJSON(object);
			var result = core.subtract(guest);
			var json = result.toBufferGeometry().toJSON();
			self.postMessage({action: "result", object: json});
		}
	}
	
	var union = function(object) {
		if (core) {
			var guest = geometryFromJSON(object);
			var result = core.union(guest);
			var json = result.toBufferGeometry().toJSON();
			self.postMessage({action: "result", object: json});
		}
	}
	
	self.addEventListener('message',function (ev){
	    switch (ev.data.action) {
        	case 'initialise':
                initialise(ev.data.object);
                break;
        	case 'intersect':
        		intersect(ev.data.object);
                break;
        	case 'subtract':
        		subtract(ev.data.object);
                break;
        	case 'union':
        		union(ev.data.object);
                break;
        	default:
        		throw 'Cannot handle specified action.';
	    }
	});
		
    //var test = ev.data;
    //self.postMessage(test, [test]);
};

