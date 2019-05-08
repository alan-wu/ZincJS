function resolveURL(url) {
	let actualURL = url;
	const prefix = (require("./zinc").modelPrefix);
	if (prefix) {
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

exports.resolveURL = resolveURL;
exports.loadExternalFile = loadExternalFile;
exports.loadExternalFiles = loadExternalFiles;
