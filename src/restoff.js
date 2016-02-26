function restoff(config) {
	var that = Object.create(RestOff.prototype);
	that._isOnline = null;
	that._forcedOffline = false;
	that._dbRepo = (undefined !== config) ? config.dbRepo ? config.dbRepo : lowdbRepo() : lowdbRepo();

	// that._autoParams = {};
	// that._autoHeaders = {};

	that._rootUri = (undefined !== config) ? config.rootUri ? config.rootUri : "" : "";
	that._primaryKeyName = (undefined !== config) ? config.primaryKeyName ? config.primaryKeyName : "id" : "id";
	return that;
}

function RestOff() {}
RestOff.prototype = Object.create(Object.prototype, {
	dbRepo: { get: function() { return this._dbRepo; }},
	isStatusOnline: { get: function() { return this._isOnline === true; }},
	isStatusOffline: { get: function() { return this._isOnline === false; }},
	isStatusUnknown: { get: function() { return this._isOnline === null; }},
	isForcedOffline: { get: function() { return this._forcedOffline; }},
	primaryKeyName: {
		get: function() { return this._primaryKeyName; },
		set: function(value) { this._primaryKeyName = value; }
	},
	rootUri: {
		get: function() { return this._rootUri; },
		set: function(value) { this._rootUri = value; }
	},
	getRequest: {
		get: function() {
			var request = window.XMLHttpRequest ?
				new XMLHttpRequest() : // Mozilla, Safari, ...
				new ActiveXObject("Microsoft.XMLHTTP"); // IE 8 and older

			// ForceOffline overrides send() which now simply calls onreadystatechange
			// We use readyState2 and override it to trick the request into
			// thinking it is complete. Why readyState2? Because readyState
			// has no setter (request.readyState = 4 throws an exception).
			if (this.isForcedOffline) {
				request.__defineGetter__('readyState2', function(){return request.__proto__.DONE;});
				request.send = function() { this.onreadystatechange(); }
			} else {
				request.__defineGetter__('readyState2', function(){ return this.readyState; });
			}
			return request;
		}
	},
	deleteSomeTime: { get: function() { return this._isOnline === true; }}
});

RestOff.prototype.uriGenerate = function(uri) {
	var result = uri;
	if (result.indexOf("http") === -1) { // missing domain/protocol/etc.
		result = this.rootUri + result;
	}
// 	var autoParams = this._autoParams;
// 	var keys = Object.keys(autoParams);
// 	if (keys.length > 0) {
// 		var first = true;
// 		if (result.indexOf("?") !== -1) {
// 			first = false;
// 		} else {
// 			result += "?";
// 		}
// 		keys.forEach(
// 			function(key) {
// 				result += (first ? "" : "&") + key + "=" + autoParams[key];
// 				first = false;
// 			}
// 		);
// 	}
	return result;
}
RestOff.prototype.forceOffline = function(resource) {
	this._forcedOffline = true;
	this._isOnline = null;
}

RestOff.prototype.primaryKeyFor = function(resource) {
	var result = resource[this.primaryKeyName];
// 	if (undefined === resource[this.primaryKeyName]) {
// 		// TODO: Write tests for this
// 		console.log("Warning: resource did not have a primaryKey " + result);
// 	}
	return result;
}


RestOff.prototype.repoAdd = function(uri, result) {
	var resource = JSON.parse(result);
	// TODO: Check for non-json result
	return this.repoAddResource(uri, resource);
}

RestOff.prototype.repoGet = function(uri) {
	var repoName = this.repoNameFrom(uri);
	return this.dbRepo.read(repoName);
}

RestOff.prototype.repoAddResource = function(uri, resources) {
	var that = this;
	var repoName = this.repoNameFrom(uri);
	if (resources instanceof Array) {
		resources.forEach(function(resource) {
			var primaryKey = that.primaryKeyFor(resource);
			that.dbRepo.write(repoName, that.primaryKeyName, primaryKey, resource)
		});
	} else {
		console.log ("HERE BUT HOW")
		// TODO: Write test for this.
		var key = this.primaryKeyFor(repoName, resource);
		that.dbRepo.write(repoName, that.primaryKeyName, primaryKey, resources)
	}
	return resources;
}

RestOff.prototype.repoNameFrom = function(uri) {
	var result = uri.replace(this.rootUri, "");

// 	if ("" === rootUri) {
// 		// No rootUri so assume rootUri is part of uri
// 		var url = document.createElement('a');
// 		url.href = uri;
// 		rootUri = url.protocol + "//" + url.hostname + (url.port ? ':' + url.port : "");
// 	}

// 	var repoName = uri.replace(rootUri, "");
// 	if ("/" === repoName[0]) {
// 		repoName = repoName.slice(1,repoName.length);
// 	}
// 	var removeSearch = repoName.split("?");
// 	if (removeSearch.length > 1) {
// 		repoName = removeSearch[0];
// 	}

// 	var removeId = repoName.split("/");
// 	if (removeId.length > 1) {
// 		repoName = removeId[0];
// 	}
	return result;
}

RestOff.prototype.get = function(uri) {
	var that = this;
	var promise = new Promise(function(resolve, reject) {

		var request = that.getRequest;
		var uriFinal = that.uriGenerate(uri);
		request.open("GET", uriFinal, true); // true: asynchronous // TODO: Write a test to cover that.uriGenerate(uri) if possible
// 		var autoHeaders = that._autoHeaders;
// 		Object.keys(autoHeaders).forEach(
// 			function(key) {
// 				request.setRequestHeader(key, autoHeaders[key]); // TODO: Write a test to cover this if possible
// 			}
// 		);

		request.onreadystatechange = function() {
			// if(request.__proto__.HEADERS_RECEIVED === request.readyState2) {
			// 	// net:ERR_CONNECTION_REFUSED only has an onreadystatechange of request.__proto__.DONE
			// } else
           if(request.__proto__.DONE === request.readyState2 ) {
				if ((request.__proto__.UNSENT === request.status) && (that.isForcedOffline)) {
					that._isOnline = false;
					resolve(that.repoGet(uriFinal));
				} else if(200 === request.status) {
					that._isOnline = true;
					resolve(that.repoAdd(uriFinal, request.response));
				} else {
					that._isOnline = 0 !== request.status ? true : null;
					reject(that.createError(request, uriFinal));
				}
			} // else ignore other readyStates
		};
		request.send();
	});
	return promise;
}

RestOff.prototype.createError = function(request, uri) {
	var message = request.statusText;
	var messageDetail = request.responseText.replace(/\r?\n|\r/g, "");
	var status = request.status;

	if (0 === status) {
		message = "Network Error";
	}

	return {
		"message" : message,
		"messageDetail" : messageDetail,
		"status": status,
		"uri": uri
	};
}

// RestOff.prototype.autoQueryParamSet = function(name, value) {
// 	this._autoParams[name] = value;
// 	return this;
// }

// RestOff.prototype.autoQueryParamSetGet = function(name) {
// 	return this._autoParams[name];
// }


// RestOff.prototype.autoHeaderParamSet = function(name, value) {
// 	this._autoHeaders[name] = value;
// 	return this;
// }

// RestOff.prototype.autoHeaderParamSetGet = function(name) {
// 	return this._autoHeaders[name];
// }



// RestOff.prototype.forceOnline = function() {
// 	this._forcedOffline = false;
// 	this._isOnline = this.ONLINE_UNKNOWN;
// }

// RestOff.prototype.repositorySizeBy = function(repoName) {
// 	return Object.keys(this.repositoryGet(repoName)).length;
// }



// RestOff.prototype.repositoryFind = function(repoName, key) {
// 	var query = {};
// 	query[this.primaryKeyName] = key;
// 	return this.dbEngine(repoName).find(query);
// }






// RestOff.prototype.repositoryGet = function(repoName) {
// 	if (undefined === this._repo[repoName]) {
// 		this._repo[repoName] = [];
// 	}
// 	if (undefined === this.dbEngine(repoName)) {
// 		console.log ("NEED TO ADD IT");
// 	}
// 	// return this.dbEngine(repoName).value();
// 	return this._repo[repoName];
// }

// RestOff.prototype.repositoryResourceGet = function(repoName, resourceId) {
// 	if (undefined === this._repo[repoName]) {
// 		this._repo[repoName] = [];
// 		return this._repo[repoName];
// 	}
// 	return this._repo[repoName][resourceId];
// }

// RestOff.prototype.repositoryDelete = function(uri) {
// 	var that = this;
// 	var aUri = document.createElement("a");
// 	aUri.href = uri;
// 	var repoName = aUri.pathname.split("/")[1];
// 	var idToRemove = aUri.pathname.split("/")[2];
// 	if (undefined === this._repo[repoName]) {
// 		this._repo[repoName] = [];
// 	}

// 	if (undefined !== this._repo[repoName][idToRemove]) {
// 		delete this._repo[repoName][idToRemove];
// 	}
// }

// RestOff.prototype.clearCacheBy = function(repoName) {
// 	if (undefined !== this._repo[repoName]) {
// 		this._repo[repoName] = [];
// 	}
// 	// delete this.dbEngine.object[repoName];
// 	// this.dbEngine.write();
// }

// RestOff.prototype.clearCacheAll = function() {
// 	var that = this;
// 	Object.keys(this.repository).forEach(
// 		function(value) {
// 			that._repo[value] = [];
// 		}
// 	);
// 	this.dbEngine.object = {};
// 	this.dbEngine.write();
// }



// RestOff.prototype.post = function(uri, resource) {
// 	var that = this;
// 	var promise = new Promise(function(resolve, reject) {
// 		var request = that.getRequest;
// 		var uriFinal = that.uriGenerate(uri);
// 		var body = JSON.stringify(resource);
// 		request.open("POST", uriFinal, true);
// 		request.onreadystatechange = function() {
// 			if(request.__proto__.DONE === request.readyState2 ) {
// 				if (201 === request.status) {
// 					// TODO: We should pull the final resource from the
// 					//       returned URI and add that to our repository
// 					//       but need a better backend system for testing
// 					resolve(that.repoAddResource(uriFinal, resource));
// 				} else {
// 					reject(that.createError(request, uriFinal)); 
// 				}
// 			} // else ignore other readyStates
// 		};
// 		request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
// 		request.send(body);
// 	});
// 	return promise;
// }

// RestOff.prototype.put = function(uri, resource) {
// 	var that = this;
// 	var promise = new Promise(function(resolve, reject) {
// 		var request = that.getRequest;
// 		var uriFinal = that.uriGenerate(uri);
// 		var body = JSON.stringify(resource);
// 		request.open("PUT", uriFinal, true);
// 		request.onreadystatechange = function() {
// 			if(request.__proto__.DONE === request.readyState2 ) {
// 				// TODO: We should pull the final resource from the
// 				//       returned URI and add that to our repository
// 				//       but need a better backend system for testing
// 				if (200 === request.status) {
// 					resolve(that.repoAddResource(uriFinal, resource));
// 				} else {
// 					reject(that.createError(request, uriFinal)); 
// 				}
// 			} // else ignore other readyStates
// 		};
// 		request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
// 		request.send(body);
// 	});
// 	return promise;
// }

// RestOff.prototype.delete = function(uri) {
// 	var that = this;

// 	var promise = new Promise(function(resolve, reject) {
// 		var request = that.getRequest;
// 		request.open("DELETE", that.uriGenerate(uri), true);
// 		request.onreadystatechange = function(){
// 			if(request.__proto__.DONE === request.readyState2 ) {
// 				if (200 === request.status) {
// 					that.repositoryDelete(uri);
// 					resolve();
// 				} else if (404 === request.status) {
// 					// No Worries. Resource wasn't on the server and now it won't be in our
// 					// local repository either (if it is even there)
// 					that.repositoryDelete(uri);
// 					resolve();
// 				} else {
// 					reject(that.createError(request, uri));					
// 				}
// 			}
// 		};
// 		request.send();
// 	});
// 	return promise;
// }

restlib.restoff = restoff;
