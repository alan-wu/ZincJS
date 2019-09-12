const THREE = require('three');

function resolveURL(url) {
	let actualURL = url;
	const prefix = (require("./zinc").modelPrefix);
	
	if (prefix) {
		if (prefix[prefix.length -1] != '/')
			prefix = prefix + '/';
		const r = new RegExp('^(?:[a-z]+:)?//', 'i');
		if (!r.test(url)) {
			actualURL =  prefix + url;
		}
	}
	
	return actualURL;
}

//Convenient function
function loadExternalFile(url, data, callback, errorCallback) {
    // Set up an asynchronous request
    const request = new XMLHttpRequest();
    request.open('GET', resolveURL(url), true);

    // Hook the event that gets called as the request progresses
    request.onreadystatechange = () => {
        // If the request is "DONE" (completed or failed)
        if (request.readyState == 4) {
            // If we got HTTP status 200 (OK)
            if (request.status == 200) {
                callback(request.responseText, data)
            } else { // Failed
                errorCallback(url);
            }
        }
    };

    request.send(null);    
}

function loadExternalFiles(urls, callback, errorCallback) {
    const numUrls = urls.length;
    let numComplete = 0;
    const result = [];

    // Callback for a single file
    function partialCallback(text, urlIndex) {
        result[urlIndex] = text;
        numComplete++;

        // When all files have downloaded
        if (numComplete == numUrls) {
            callback(result);
        }
    }

    for (let i = 0; i < numUrls; i++) {
    	loadExternalFile(urls[i], i, partialCallback, errorCallback);
    }
}


//Get the colours at index
exports.getColorsRGB = (colors, index) => {
    const index_in_colors = Math.floor(index/3);
    const remainder = index%3;
    let hex_value = 0;
    if (remainder == 0)
    {
        hex_value = colors[index_in_colors].r;
    }
    else if (remainder == 1)
    {
        hex_value = colors[index_in_colors].g;
    }
    else if (remainder == 2)
    {
        hex_value = colors[index_in_colors].b;
    }
    const mycolor = new THREE.Color(hex_value);
    return [mycolor.r, mycolor.g, mycolor.b];
}

exports.resolveURL = resolveURL;
exports.loadExternalFile = loadExternalFile;
exports.loadExternalFiles = loadExternalFiles;
