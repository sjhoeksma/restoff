
/*
Note: We will be refactoring restoff to seperate repository features
from the restoff features. Loose coupling, separation of concerns and the such.

So, please don't judge us quite yet. :-)

*/

function restoff(config) {
	var that = Object.create(RestOff.prototype);
	that._isOnline = that.ONLINE_UNKNOWN;
	that._forcedOffline = false;
	that._repo = {};
	that._autoParams = {};
	that._autoHeaders = {};

	that._rootUri = (undefined !== config) ? config.rootUri ? config.rootUri : "" : "";
	that._dbName = (undefined !== config) ? config.dbName ? config.dbName : "restoff" : "restoff";
	that._primaryKeyName = (undefined !== config) ? config.primaryKeyName ? config.primaryKeyName : "id" : "id";
	that._dbEngine = low(that._dbName, { storage: low.localStorage }); // local storage
	return that;
}

function RestOff() {}
RestOff.prototype = Object.create(Object.prototype, {
	rootUri: {
		get: function() { return this._rootUri; },
		set: function(value) { this._rootUri = value; }
	},
	dbName: {
		get: function() { return this._dbName; },
		set: function(value) { this._dbName = value; }
	},
	primaryKeyName: {
		get: function() { return this._primaryKeyName; },
		set: function(value) { this._primaryKeyName = value; }
	},
	isForcedOffline: {
		get: function() { return this._forcedOffline; }
	},
	repository: { get: function() { return this._repo; }},
	repositorySize: { get: function() { return Object.keys(this.repository).length; }},
	dbEngine: { get: function() { return this._dbEngine; }},
	isOnline: { get: function() { return this._isOnline === this.ONLINE; }},
	isOffline: { get: function() { return this._isOnline === this.ONLINE_NOT; }},
	isOnlineUnknown: { get: function() { return this._isOnline === this.ONLINE_UNKNOWN; }},
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
	}
});

RestOff.prototype.ONLINE_UNKNOWN = null;
RestOff.prototype.ONLINE = true;
RestOff.prototype.ONLINE_NOT = false;

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

RestOff.prototype.autoQueryParamSet = function(name, value) {
	this._autoParams[name] = value;
	return this;
}

RestOff.prototype.autoQueryParamSetGet = function(name) {
	return this._autoParams[name];
}


RestOff.prototype.autoHeaderParamSet = function(name, value) {
	this._autoHeaders[name] = value;
	return this;
}

RestOff.prototype.autoHeaderParamSetGet = function(name) {
	return this._autoHeaders[name];
}

RestOff.prototype.uriGenerate = function(uri) {
	var result = uri;
	if (result.indexOf("http") === -1) { // missing domain/protocol/etc.
		result = this.rootUri + result;
	}
	var autoParams = this._autoParams;
	var keys = Object.keys(autoParams);
	if (keys.length > 0) {
		var first = true;
		if (result.indexOf("?") !== -1) {
			first = false;
		} else {
			result += "?";
		}
		keys.forEach(
			function(key) {
				result += (first ? "" : "&") + key + "=" + autoParams[key];
				first = false;
			}
		);
	}
	return result;
}

RestOff.prototype.forceOffline = function() {
	this._forcedOffline = true;
	this._isOnline = this.ONLINE_NOT;
}

RestOff.prototype.forceOnline = function() {
	this._forcedOffline = false;
	this._isOnline = this.ONLINE_UNKNOWN;
}

RestOff.prototype.repositorySizeBy = function(repositoryName) {
	return Object.keys(this.repositoryGet(repositoryName)).length;
}

RestOff.prototype.repositoryNameFrom = function(uri) {
	var rootUri = this.rootUri;

	if ("" === rootUri) {
		// No rootUri so assume rootUri is part of uri
		var url = document.createElement('a');
		url.href = uri;
		rootUri = url.protocol + "//" + url.hostname + (url.port ? ':' + url.port : "");
	}

	var repositoryName = uri.replace(rootUri, "");
	if ("/" === repositoryName[0]) {
		repositoryName = repositoryName.slice(1,repositoryName.length);
	}
	var removeSearch = repositoryName.split("?");
	if (removeSearch.length > 1) {
		repositoryName = removeSearch[0];
	}

	var removeId = repositoryName.split("/");
	if (removeId.length > 1) {
		repositoryName = removeId[0];
	}

	return repositoryName;
}

RestOff.prototype.primaryKeyFor = function(repositoryName, resource) {
	var result = resource[this.primaryKeyName];
	if (undefined === resource[this.primaryKeyName]) {
		// TODO: Write tests for this
		console.log("Warning: resource did not have a primaryKey " + result);
	}
	return result;
}

// TODO: Refactor... Repo should be it's own thing
RestOff.prototype.repositoryAdd = function(uri, result) {
	var resource = JSON.parse(result);
	// TODO: Check for non-json result
	return this.repositoryAddResource(uri, resource);
}

RestOff.prototype.repositoryAddResource = function(uri, resource) {
	var repositoryName = this.repositoryNameFrom(uri);
	var that = this;
	if (undefined === this._repo[repositoryName]) {
		this._repo[repositoryName] = [];
	}

	// TODO: There is no consolodiation at this time but will come soonish.
	//       So right now, we literally overwrite whatever is there.
	if (resource instanceof Array) {
		resource.forEach(function(aresource) {
			that._repo[repositoryName][that.primaryKeyFor(repositoryName, aresource)] = aresource;
			that.dbEngine(repositoryName).push(aresource);
		});
	} else {
		this._repo[repositoryName][this.primaryKeyFor(repositoryName, resource)] = resource;
		// TODO: Write a test for this 
		this.dbEngine(repositoryName).push(resource);
	}
	return this._repo[repositoryName];
}

RestOff.prototype.repositoryGet = function(repositoryName) {
	if (undefined === this._repo[repositoryName]) {
		this._repo[repositoryName] = [];
	}
	// if (undefined === this.dbEngine(repositoryName)) {
	// 	console.log ("NEED TO ADD IT");
	// }
	return this._repo[repositoryName];
}

RestOff.prototype.repositoryResourceGet = function(repositoryName, resourceId) {
	if (undefined === this._repo[repositoryName]) {
		this._repo[repositoryName] = [];
		return this._repo[repositoryName];
	}
	return this._repo[repositoryName][resourceId];
}

RestOff.prototype.repositoryDelete = function(uri) {
	var that = this;
	var aUri = document.createElement("a");
	aUri.href = uri;
	var repositoryName = aUri.pathname.split("/")[1];
	var idToRemove = aUri.pathname.split("/")[2];
	if (undefined === this._repo[repositoryName]) {
		this._repo[repositoryName] = [];
	}

	if (undefined !== this._repo[repositoryName][idToRemove]) {
		delete this._repo[repositoryName][idToRemove];
	}
}

RestOff.prototype.clearCacheBy = function(repositoryName) {
	if (undefined !== this._repo[repositoryName]) {
		this._repo[repositoryName] = [];
	}
}

RestOff.prototype.clearCacheAll = function() {
	var that = this;
	Object.keys(this.repository).forEach(
		function(value) {
			that._repo[value] = [];
		}
	);
}

RestOff.prototype.get = function(uri) {
	var that = this;
	var promise = new Promise(function(resolve, reject) {
		var request = that.getRequest;
		var uriFinal = that.uriGenerate(uri);
		request.open("GET", uriFinal, true); // true: asynchronous // TODO: Write a test to cover that.uriGenerate(uri) if possible
		var autoHeaders = that._autoHeaders;
		Object.keys(autoHeaders).forEach(
			function(key) {
				request.setRequestHeader(key, autoHeaders[key]); // TODO: Write a test to cover this if possible
			}
		);

		request.onreadystatechange = function(){

			if(request.__proto__.HEADERS_RECEIVED === request.readyState2) {
				// net:ERR_CONNECTION_REFUSED only has an onreadystatechange of request.__proto__.DONE
			} else if(request.__proto__.DONE === request.readyState2 ) {
				if ((request.__proto__.UNSENT === request.status) && (that.isForcedOffline)) {
						// that._isOnline = that.ONLINE_NOT; // TODO: Write a test to cover this line of code
					var repositoryName = that.repositoryNameFrom(uriFinal);
					if (undefined === that.repository[repositoryName]) {
						that.repositoryAddResource(uriFinal, []); // offline and first call to the endpoint made
					}
					resolve(that.repository[repositoryName]);
				} else if(200 === request.status) {
					that._isOnline = that.ONLINE;
					resolve(that.repositoryAdd(uriFinal, request.response));
				} else {
					that._isOnline = that.ONLINE_NOT;
					reject(that.createError(request, uriFinal));
				}
			} // else ignore other readyStates
		};
		request.send();
	});
	return promise;
}

RestOff.prototype.post = function(uri, resource) {
	var that = this;
	var promise = new Promise(function(resolve, reject) {
		var request = that.getRequest;
		var uriFinal = that.uriGenerate(uri);
		var body = JSON.stringify(resource);
		request.open("POST", uriFinal, true);
		request.onreadystatechange = function() {
			if(request.__proto__.DONE === request.readyState2 ) {
				if (201 === request.status) {
					// TODO: We should pull the final resource from the
					//       returned URI and add that to our repository
					//       but need a better backend system for testing
					resolve(that.repositoryAddResource(uriFinal, resource));
				} else {
					reject(that.createError(request, uriFinal)); 
				}
			} // else ignore other readyStates
		};
		request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		request.send(body);
	});
	return promise;
}

RestOff.prototype.put = function(uri, resource) {
	var that = this;
	var promise = new Promise(function(resolve, reject) {
		var request = that.getRequest;
		var uriFinal = that.uriGenerate(uri);
		var body = JSON.stringify(resource);
		request.open("PUT", uriFinal, true);
		request.onreadystatechange = function() {
			if(request.__proto__.DONE === request.readyState2 ) {
				// TODO: We should pull the final resource from the
				//       returned URI and add that to our repository
				//       but need a better backend system for testing
				if (200 === request.status) {
					resolve(that.repositoryAddResource(uriFinal, resource));
				} else {
					reject(that.createError(request, uriFinal)); 
				}
			} // else ignore other readyStates
		};
		request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		request.send(body);
	});
	return promise;
}

RestOff.prototype.delete = function(uri) {
	var that = this;

	var promise = new Promise(function(resolve, reject) {
		var request = that.getRequest;
		request.open("DELETE", that.uriGenerate(uri), true);
		request.onreadystatechange = function(){
			if(request.__proto__.DONE === request.readyState2 ) {
				if (200 === request.status) {
					that.repositoryDelete(uri);
					resolve();
				} else if (404 === request.status) {
					// No Worries. Resource wasn't on the server and now it won't be in our
					// local repository either (if it is even there)
					that.repositoryDelete(uri);
					resolve();
				} else {
					reject(that.createError(request, uri));					
				}
			}
		};
		request.send();
	});
	return promise;
}

restlib.restoff = restoff;
