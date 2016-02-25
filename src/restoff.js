function restoff(config) {
	var that = Object.create(RestOff.prototype);
	that._isOnline = that.ONLINE_UNKNOWN;
	that._forcedOffline = false;
	that._repo = {};
	that._autoParams = {};
	that._autoHeaders = {};

	that._rootUri = (undefined !== config) ? config.rootUri ? config.rootUri : "" : "";
	that._dbName = (undefined !== config) ? config.dbName ? config.dbName : "restoff.json" : "restoff.json";
	that._primaryKeyName = (undefined !== config) ? config.primaryKeyName ? config.primaryKeyName : "id" : "id";

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

RestOff.prototype.autoQueryParam = function(name, value) {
	this._autoParams[name] = value;
	return this;
}

RestOff.prototype.autoQueryParamGet = function(name) {
	return this._autoParams[name];
}


RestOff.prototype.autoHeaderParam = function(name, value) {
	this._autoHeaders[name] = value;
	return this;
}

RestOff.prototype.autoHeaderParamGet = function(name) {
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

RestOff.prototype.repositorySizeBy = function(repoName) {
	return Object.keys(this.repositoryGet(repoName)).length;
}

RestOff.prototype.repositoryNameFrom = function(uri) {
	var rootUri = this.rootUri;

	if ("" === rootUri) {
		var url = document.createElement('a');
		url.href = uri;
		rootUri = url.protocol + "//" + url.hostname + (url.port ? ':' + url.port : "");
	}

	var repoName = uri.replace(rootUri, "");
	if ("/" === repoName[0]) {
		repoName = repoName.slice(1,repoName.length);
	}
	var removeSearch = repoName.split("?");
	if (removeSearch.length > 1) {
		repoName = removeSearch[0];
	}
	return repoName;
}

RestOff.prototype.primaryKeyFor = function(repoName, obj) {
	var result = obj[this.primaryKeyName];
	if (undefined === obj[this.primaryKeyName]) {
		// TODO: Write tests for this
		console.log("Warning: object did not have a primaryKey " + result);
	}
	return result;
}

// TODO: Refactor... Repo should be it's own thing
RestOff.prototype.repositoryAdd = function(uri, result) {
	var obj = JSON.parse(result);
	// TODO: Check for non-json result
	return this.repositoryAddObject(uri, obj);
}

RestOff.prototype.repositoryAddObject = function(uri, obj) {
	var repoName = this.repositoryNameFrom(uri);
	var that = this;
	if (undefined === this._repo[repoName]) {
		this._repo[repoName] = [];
	}

	// TODO: There is no consolodiation at this time but will come soonish.
	//       So right now, we literally overwrite whatever is there.
	if (obj instanceof Array) {
		obj.forEach(function(item) {
			that._repo[repoName][that.primaryKeyFor(repoName, item)] = item;
		});
	} else {
		this._repo[repoName][this.primaryKeyFor(repoName, obj)] = obj;
	}
	return this._repo[repoName];
}

RestOff.prototype.repositoryGet = function(repoName) {
	if (undefined === this._repo[repoName]) {
		this._repo[repoName] = [];
	}
	return this._repo[repoName];
}

RestOff.prototype.repositoryResourceGet = function(repoName, resourceId) {
	if (undefined === this._repo[repoName]) {
		this._repo[repoName] = [];
		return this._repo[repoName];
	}
	return this._repo[repoName][resourceId];
}

RestOff.prototype.repositoryDelete = function(uri) {
	var that = this;
	var aUri = document.createElement("a");
	aUri.href = uri;
	var repoName = aUri.pathname.split("/")[1];
	var idToRemove = aUri.pathname.split("/")[2];
	if (undefined === this._repo[repoName]) {
		this._repo[repoName] = [];
	}

	if (undefined !== this._repo[repoName][idToRemove]) {
		delete this._repo[repoName][idToRemove];
	}
}

RestOff.prototype.clearCacheBy = function(repoName) {
	if (undefined !== this._repo[repoName]) {
		this._repo[repoName] = [];
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
					var repoName = that.repositoryNameFrom(uriFinal);
					if (undefined === that.repository[repoName]) {
						that.repositoryAddObject(uriFinal, []); // offline and first call to the endpoint made
					}
					resolve(that.repository[repoName]);
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

RestOff.prototype.post = function(uri, object) {
	var that = this;
	var promise = new Promise(function(resolve, reject) {
		var request = that.getRequest;
		var uriFinal = that.uriGenerate(uri);
		var body = JSON.stringify(object);
		request.open("POST", uriFinal, true);
		request.onreadystatechange = function() {
			if(request.__proto__.DONE === request.readyState2 ) {
				if (201 === request.status) {
					var repoName = that.repositoryNameFrom(uriFinal);
					resolve(that.repositoryAddObject(uriFinal, object));
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
					// No Worries. Wasn't in repo and now it won't be in our
					// local repository either (if it is there)
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
