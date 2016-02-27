function restoff(config) {
	var that = Object.create(RestOff.prototype);
	that._isOnline = null;
	that._forcedOffline = false;
	that._persistanceDisabled = (undefined !== config) ? config.persistanceDisabled ? config.persistanceDisabled : false : false;
	if (that._persistanceDisabled) {
		that._dbRepo = null;
	} else {
		that._dbRepo = (undefined !== config) ? config.dbRepo ? config.dbRepo : lowdbRepo() : lowdbRepo();
	}
	that._autoParams = {};
	that._autoHeaders = {};
	that._pending = [];

	that._rootUri = (undefined !== config) ? config.rootUri ? config.rootUri : "" : "";
	that._primaryKeyName = (undefined !== config) ? config.primaryKeyName ? config.primaryKeyName : "id" : "id";

	return that;
}

function RestOff() {}
RestOff.prototype = Object.create(Object.prototype, {
	dbRepo: { get: function() { return this._dbRepo; }},
	pending: { get: function() { return this._pending; }},
	isStatusOnline: { get: function() { return this._isOnline === true; }},
	isStatusOffline: { get: function() { return this._isOnline === false; }},
	isStatusUnknown: { get: function() { return this._isOnline === null; }},
	isForcedOffline: { get: function() { return this._forcedOffline; }},
	persistanceDisabled: {
		get: function() { return this._persistanceDisabled; },
		set: function(value) {
			this._persistanceDisabled = value;
			this._dbRepo = value ? null : lowdbRepo();
		}
	},
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

RestOff.prototype.clearAll = function(force) {
	force = undefined === force ? false : force;
	if ((this.pending.length > 0) && (false === force)) {
		throw new Error("Submit pending changes before clearing database or call clearAll(true) to force.");
	}
	this._dbRepo.clearAll();
	this._pending = [];
}

RestOff.prototype.clear = function(repoName, force) {
	force = undefined === force ? false : force;
	if ((this.pending.length > 0) && (false === force)) {
		throw new Error("Submit pending changes before clearing database or call clear(repoName, true) to force.");
	}
	this._dbRepo.clear(repoName);
	this._pending.forEach(function (pendingItem, index, array) {
		if (repoName === pendingItem.repoName) {
			array.splice(index, 1);
		}
	});
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
RestOff.prototype.forceOffline = function(resource) {
	this._forcedOffline = true;
	this._isOnline = null;
	return this;
}

RestOff.prototype.primaryKeyFor = function(resource) {
	var result = resource[this.primaryKeyName];
	if (undefined === resource[this.primaryKeyName]) {
		// TODO: Write tests for this
		console.log("Warning: resource did not have a primaryKey " + result);
	}
	return result;
}


RestOff.prototype.repoAdd = function(uri, result) {
	var resource = JSON.parse(result);
	// TODO: Check for non-json result
	return this.repoAddResource(uri, resource);
}

RestOff.prototype.repoGet = function(uri) {
	return this.persistanceDisabled ? [] : this.dbRepo.read(this.repoNameFrom(uri));
}

RestOff.prototype.repoAddResource = function(uri, resources) {
	var resourceArray = (resources instanceof Array) ? resources : [resources]; // make logic easier
	if (!this.persistanceDisabled) {
		var that = this;
		var repoName = this.repoNameFrom(uri);
		resourceArray.forEach(function(resource) {
			var primaryKey = that.primaryKeyFor(resource);
			that.dbRepo.write(repoName, that.primaryKeyName, primaryKey, resource);
		});
	} // else don't persist
	return resources;
}

RestOff.prototype._uriClean = function(uri) {
	var result = uri.replace(this.rootUri, "");

	var removeSearch = result.split("?");
	if (removeSearch.length > 1) {
		result = removeSearch[0];
	}
	return result;
}

RestOff.prototype.repoNameFrom = function(uri) {
	var result = this._uriClean(uri);
	var removeId = result.split("/"); // TODO Support nested resources
	if (removeId.length > 1) {
		result = removeId[0];
	}
	return result;
}

RestOff.prototype.primaryKeyFrom = function(uri) {
	var result = this._uriClean(uri);
	var removeId = result.split("/"); // TODO Support nested resources
	if (removeId.length > 1) {
		result = removeId[1];
	}
	return result;
}

RestOff.prototype.createError = function(request, uri, status, message) {
	var messageDetail = request.responseText.replace(/\r?\n|\r/g, "");

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

RestOff.prototype.autoQueryParamGet = function(name) {
	return this._autoParams[name];
}

RestOff.prototype.autoHeaderParamSet = function(name, value) {
	this._autoHeaders[name] = value;
	return this;
}

RestOff.prototype.autoHeaderParamGet = function(name) {
	return this._autoHeaders[name];
}

// TODO: Add dbCallType
RestOff.prototype.pendingAdd = function(uriFinal, resource, restCall) {
	var result = {
		"restCall" : restCall,
		"resource" : resource,
		"clientTime" : new Date(),
		"uri" : uriFinal,
		"repoName" : this.repoNameFrom(uriFinal)
	}
	this._pending.push(result);
	return result;
}


RestOff.prototype.get = function(uri) {
	var that = this;
	var promise = new Promise(function(resolve, reject) {

		var request = that.getRequest;
		var uriFinal = that.uriGenerate(uri); // TODO: Write a test to cover that.uriGenerate(uri) if possible
		request.open("GET", uriFinal, true); // true: asynchronous 
		var autoHeaders = that._autoHeaders;
		Object.keys(autoHeaders).forEach(
			function(key) {
				request.setRequestHeader(key, autoHeaders[key]); // TODO: Write a test to cover this if possible
			}
		);

		request.onreadystatechange = function() {
           if(request.__proto__.DONE === request.readyState2 ) {
				if ((request.__proto__.UNSENT === request.status) && (that.isForcedOffline)) {
					that._isOnline = false;
					resolve(that.repoGet(uriFinal));
				} else if(200 === request.status) {
					that._isOnline = true;
					resolve(that.repoAdd(uriFinal, request.response));
				} else { 
					// all request values are the same for ERR_NAME_NOT_RESOLVED and ERR_INTERNET_DISCONNECTED so can't tell if we are online or not. :-(
					that._isOnline = 0 !== request.status ? true : null;
					reject(that.createError(request, uriFinal, request.status, request.statusText));
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
				if ((request.__proto__.UNSENT === request.status) && (that.isForcedOffline)) {
					that._isOnline = false;
					that.pendingAdd(uriFinal, resource, "POST");
					resolve(that.repoAddResource(uriFinal, resource));
				} else if (201 === request.status) {
					that._isOnline = true;
					resolve(that.repoAddResource(uriFinal, resource)); // TODO: IMPORTANT!!! Use request.response: need to add backend service to test this
				} else {
					that._isOnline = 0 !== request.status ? true : null;
					reject(that.createError(request, uriFinal, request.status, request.statusText)); 
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
				if (200 === request.status) {
					that._isOnline = true;
					resolve(that.repoAddResource(uriFinal, resource)); // TODO: IMPORTANT!!! Use request.response: need to add backend service to test this
				} else {

					var finalStatus = request.status;
					var finalMessage = request.statusText;
					that._isOnline = 0 !== request.status ? true : null;
					if (that.isForcedOffline) { // we are offline, but resource not found so 404 it.
						var repoName = that.repoNameFrom(uriFinal);
						var primaryKey = that.primaryKeyFor(resource);
						if (that._dbRepo.find(repoName, that.primaryKeyName, primaryKey)) { // offline but found on client so add it
							that.pendingAdd(uriFinal, resource, "PUT");
							resolve(that.repoAddResource(uriFinal, resource));
						} else {
							finalStatus = 404;
							finalMessage = "Not Found"
							reject(that.createError(request, uriFinal, finalStatus, finalMessage));
						}
					} else {
						that._isOnline = 0 !== request.status ? true : null; // TODO: Write test for this line of code
						reject(that.createError(request, uriFinal, request.status, request.statusText)); 
					}
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
		var uriFinal = that.uriGenerate(uri);
		request.open("DELETE", that.uriGenerate(uriFinal), true);
		request.onreadystatechange = function(){
			if(request.__proto__.DONE === request.readyState2 ) {
				var repoName = that.repoNameFrom(uriFinal);
				var primaryKeyName = that.primaryKeyName;
				var primaryKey = that.primaryKeyFrom(uriFinal);

				if ((request.__proto__.UNSENT === request.status) && (that.isForcedOffline)) {
					that._isOnline = false; // TODO: Write a test for this line of code
					that.pendingAdd(uriFinal, undefined, "DELETE");
					that.dbRepo.delete(repoName, primaryKeyName, primaryKey);
					resolve();
				} else if (200 === request.status) {
					that._isOnline = true; // TODO: Write a test for this line of code
					that.dbRepo.delete(repoName, primaryKeyName, primaryKey);
					resolve();
				} else if (404 === request.status) {
					that._isOnline = true;
					// No Worries. Resource wasn't on the server and now it won't be in our
					// local repository either (if it is even there)
					that.dbRepo.delete(repoName, primaryKeyName, primaryKey);
					resolve();
				} else {
					that._isOnline = 0 !== request.status ? true : null; // TODO: Write test for this line of code
					reject(that.createError(request, uri, request.status, request.message));					
				}
			} // else ignore other readyStates
		};
		request.send();
	});
	return promise;
}

restlib.restoff = restoff;