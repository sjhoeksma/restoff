function restoff(config) {
	var defaultConfig = {
		primaryKeyName: "id",
		rootUri: "",
		clientOnly: false,
		forcedOffline: false,
		persistanceDisabled: false,
		pendingUri: "http://localhost/",
		pendingRepoName: "pending"
	};

	var that = Object.create(RestOff.prototype);
	that._options = Object.assign(defaultConfig, config);

	that._isOnline = null;
	that._autoParams = {};
	that._autoHeaders = {};

	if (that._options.persistanceDisabled) {
		that._dbRepo = null;
	} else {
		that._dbRepo = (undefined !== config) ? config.dbRepo ? config.dbRepo : lowdbRepo() : lowdbRepo();
	}

	return that;
}

function RestOff() {}
RestOff.prototype = Object.create(Object.prototype, {
	dbRepo: { get: function() { return this._dbRepo; }},
	isStatusOnline: { get: function() { return this._isOnline === true; }},
	isStatusOffline: { get: function() { return this._isOnline === false; }},
	isStatusUnknown: { get: function() { return this._isOnline === null; }},
	forcedOffline: {
		get: function() { return this._options.forcedOffline; },
		set: function(value) {
			this._options.forcedOffline = value;
			this._isOnline = null;
		}
	},
	clientOnly: {
		get: function() { return this._options.clientOnly; },
		set: function(value) { this._options.clientOnly = value; }
	},
	pendingRepoName: {
		get: function() { return this._options.pendingRepoName; }
	},
	pendingUri: {
		get: function() { return this._options.pendingUri; }
	},
	persistanceDisabled: {
		get: function() { return this._options.persistanceDisabled; },
		set: function(value) {
			this._options.persistanceDisabled = value;
			this._dbRepo = value ? null : lowdbRepo();
		}
	},
	primaryKeyName: {
		get: function() { return this._options.primaryKeyName; },
		set: function(value) { this._options.primaryKeyName = value; }
	},
	rootUri: {
		get: function() { return this._options.rootUri; },
		set: function(value) { this._options.rootUri = value; }
	},
	options: {
		get: function() { return this._options; }
	}
});

RestOff.prototype._logMessage = function(message) {
	console.log(message);
}

RestOff.prototype._pendingWrite = function(pendingRec) {
	var that = this;
	return new Promise(function(resolve, reject) {
		// Eat our own dog food
		return that.post(that.pendingUri + that.pendingRepoName, pendingRec, {rootUri:that.pendingUri,clientOnly:true}).then(function(result) {
			resolve(result);
		}).catch(function(error) {
			reject(error);
		}); 
	});
} 

RestOff.prototype._pendingLength = function(repoName) {
	var that = this;
	return new Promise(function(resolve, reject) {
		var uri = that.pendingRepoName + (repoName ? "?repoName=" + repoName : "");
		// Eat our own dog food
		return that.get(uri, {rootUri:that.pendingUri,clientOnly:true}).then(function(data) {
			resolve(data.length);
		}).catch(function(error) {
			reject(error);
		});
	});
}

RestOff.prototype._pendingClear = function(repoName) {
	var that = this;
	return new Promise(function(resolve, reject) {
		// Eat our own dog food.
		return that.delete(that.pendingRepoName + "?repoName=" + repoName, {rootUri:that.pendingUri, clientOnly:true}).then(function(result) {
			resolve();
		}).catch(function(error) {
			reject(error);
		});
	});
}

RestOff.prototype._pendingClearAll = function() {
	var that = this;
	return new Promise(function(resolve, reject) {
		// Eat our own dog food
		return that.delete(that.pendingRepoName, {rootUri:that.pendingUri, clientOnly:true}).then(function(result) {
			resolve();
		}).catch(function(error) {
			reject(error);
		});
	});
}

RestOff.prototype._requestGet = function(uri) {
	var request = window.XMLHttpRequest ?
		new XMLHttpRequest() : // Mozilla, Safari, ...
		new ActiveXObject("Microsoft.XMLHTTP"); // IE 8 and older

	// ForceOffline overrides send() which now simply calls onreadystatechange
	// We use readyStateRestOff and override it to trick the request into
	// thinking it is complete. Why readyStateRestOff? Because readyState
	// has no setter (request.readyState = 4 throws an exception).
	if (uri.options.forcedOffline || uri.options.clientOnly) {
		request.__defineGetter__('readyStateRestOff', function(){return request.__proto__.DONE;});
		request.send = function() { this.onreadystatechange(); }
	} else {
		request.__defineGetter__('readyStateRestOff', function(){ return this.readyState; });
	}
	return request;
}

RestOff.prototype._uriGenerate = function(uri) {
	var result = uri.uri;
	if (result.indexOf("http") === -1) { // missing domain/protocol/etc.
		result = uri.options.rootUri + result;
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


RestOff.prototype.uriFromClient = function(uri, restMethod, resources, options) {
	var uriResult = {
		uri: uri,
		primaryKey : "",
		primaryKeyName : this.primaryKeyName,
		restMethod : restMethod,
		resources : resources,
		options : Object.assign({}, this._options, options),
		searchOptions : {}
	};

	if (!uriResult.options.rootUri.endsWith("/")) {
		uriResult.options.rootUri = uriResult.options.rootUri + "/";
	}
	uriResult.uriFinal = this._uriGenerate(uriResult);
	var result = uri.replace(uriResult.options.rootUri, "");

	var search = result.split("?");
	if (search.length > 1) {
		var that = this;
		result = search[0];
		uriResult.search = search[1]
		uriResult.search.split("&").forEach(function(item) {
			var itemParts = item.split("=");
			if (2 === itemParts.length) {
				uriResult.searchOptions[itemParts[0]] = itemParts[1];
			} else {
				that._logMessage("WARNING: Invalid search query in uri " + uriResult.uriFinal + "'."); // TODO: Write Test for this.
			}
		});
	}

	var uriPrimaryKey = result.split("/"); 
	if (uriPrimaryKey.length > 1) {
		result = uriPrimaryKey[0];
		uriResult.primaryKey = uriPrimaryKey[1]; // TODO Support nested resources
	}

	// TODO: Check if resource PK != uri pk and warn
	if (("" === uriResult.primaryKey) && (undefined !== resources) && (null !== resources) && (undefined !== resources[this.primaryKeyName])) {
		uriResult.primaryKey = resources[this.primaryKeyName];
	}
	uriResult.repoName = result;	
	if (("http:" === uriResult.repoName) || ("" === uriResult.repoName)) {
		// Note: We really can't figure out the rootUri from the uri provided when no rootUri was
		//       configured. This is because the rootUri could contain anything plus resource names
		// 	     and we don't know where the anything part stops and the resources start. So, we get
		//       this warning.
		this._logMessage("WARNING: repoName invalid. Had a uri of '" + uri + "' and a rootUri of '" + uriResult.options.rootUri + "'' which may be incorrect?");
	}
	return uriResult;
}

RestOff.prototype._primaryKeyFor = function(resource) {
	var result = resource[this.primaryKeyName];
	if (undefined === resource[this.primaryKeyName]) {
		console.log("WARNING: resource %O did not have a primaryKey " + this.primaryKeyName, resource); // TODO: Write tests for this
	}
	return result;
}

RestOff.prototype.clearAll = function(force) {
	var that = this;

	return new Promise(function(resolve, reject) {
		force = undefined === force ? false : force;
		return that._pendingLength().then(function(pendLength) {
			if ((pendLength > 0) && (false === force)) {
				reject("Submit pending changes before clearing database or call clearAll(true) to force.");
			} else {
				that._dbRepo.clearAll();
				return that._pendingClearAll().then(function(result) {
					resolve();
				});
			}
		});
	});
}

RestOff.prototype.clear = function(repoName, force) {
	var that = this;
	return new Promise(function(resolve, reject) {
		force = undefined === force ? false : force;
		return that._pendingLength(repoName).then(function(pendLength) {
			if ((pendLength > 0) && (false === force)) {
				reject("Submit pending changes before clearing database or call clear(repoName, true) to force.");
			} else {
				that._dbRepo.clear(repoName);
				return that._pendingClear(repoName).then(function(result) {
					resolve();
				});
			}
		});
	});
}

RestOff.prototype._repoGet = function(uri) {
	var query = uri.searchOptions;
	if ("" !== uri.primaryKey) {
		query[uri.primaryKeyName] = uri.primaryKey;
	}
	return uri.options.persistanceDisabled ? [] : this.dbRepo.read(uri.repoName, query);
}

RestOff.prototype._repoFind = function(uri) {
	return this._dbRepo.find(uri.repoName, uri.primaryKeyName, uri.primaryKey)	
}

RestOff.prototype._repoAdd = function(uri, resourceRaw) {
	var that = this;
	return new Promise(function(resolve, reject) {
		uri.resources = JSON.parse(resourceRaw); // TODO: Check for non-json result and throw error/convert/support images/etc.
		return that._repoAddResource(uri).then(function(result) {
			resolve(result);
		});
	});
}

RestOff.prototype._repoAddAll = function(uri, resourceArray) {
	var that = this;
	resourceArray.forEach(function(resource) {
		var primaryKey = that._primaryKeyFor(resource);
		that.dbRepo.write(uri.repoName, that.primaryKeyName, primaryKey, resource);
	});
}

RestOff.prototype._repoAddResource = function(uri) {
	var that = this;
	return new Promise(function(resolve, reject) {
		var resourceArray = (uri.resources instanceof Array) ? uri.resources : [uri.resources]; // make logic easier
		if (!uri.options.persistanceDisabled) {
			// TODO: Check for soft deletes so we don't need to get all the records from the database
			if (("" === uri.primaryKey) && ("GET" === uri.restMethod)) {  // Complete get, doing a merge because we don't have soft_delete
			     return that.clear(uri.repoName).then(function() {  // TODO: What do we do when there are pending changes
			     	that._repoAddAll(uri, resourceArray);
					resolve(uri.resources);
			     });
			} else {
				that._repoAddAll(uri, resourceArray);
			}
		} // else don't persist

		resolve(uri.resources);
	});
}

RestOff.prototype._repoDeleteResource = function(uri) {
	if (!uri.options.persistanceDisabled) {
		var searchOptions = uri.searchOptions;
		if ("" !== uri.primaryKey) {
			searchOptions[uri.primaryKeyName] = uri.primaryKey;
		}
		this.dbRepo.delete(uri.repoName, searchOptions);
	}
	return (uri.primaryKey);
}

RestOff.prototype._createError = function(uri) {
	var request = uri.request;
	var messageDetail = request.responseText.replace(/\r?\n|\r/g, "");
	var message = request.statusText;

	if (0 === request.status) {
		message = "Network Error";
	}

	return {
		"message" : message,
		"messageDetail" : messageDetail,
		"status": request.status,
		"uri": uri.uriFinal
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

// TODO: Add database calling type
RestOff.prototype._pendingAdd = function(uri) {
	var that = this;
	return new Promise(function(resolve, reject) {
		var result = {
			"id" : new Date(), // TODO: Add a guid generator
			"restMethod" : uri.restMethod,
			"resources" : uri.resources,
			"clientTime" : new Date(),
			"uri" : uri.uriFinal,
			"repoName" : uri.repoName
		}

		if (!uri.options.persistanceDisabled) {
			that._pendingWrite(result);
		}
		resolve(result);
	});
}

RestOff.prototype._requestHeaderSet = function(request) {
	var autoHeaders = this._autoHeaders;
	Object.keys(autoHeaders).forEach(
		function(key) {
			request.setRequestHeader(key, autoHeaders[key]); // TODO: Write a test to cover this
		}
	);
}

RestOff.prototype._uriAddRequest = function(uri, request) {
	uri.request = {
		readyState : request.readyStateRestOff,
		status : request.status,
		statusText : request.statusText,
		response: request.response,
		responseText: request.responseText
	};
	return uri;
}

RestOff.prototype._dbDelete = function(uri, resolve, reject) {
	var request = uri.request;
	switch (request.status) {
		case 200: case 202: case 204: // TODO: Write test for 202 and 204
			this._isOnline = true;
			resolve(this._repoDeleteResource(uri));
		break;
		case 404:
			this._isOnline = true;
			resolve(this._repoDeleteResource(uri)); // 404 but will remove from client anyway
		break;
		case 0:
			var clientOnly = uri.options.clientOnly;
			if (uri.options.forcedOffline || clientOnly) {
				if (!clientOnly) {
					var that = this;
					this._isOnline = false;
					this._pendingAdd(uri).then(function(result) {
						that._repoDeleteResource(uri);
						resolve();
					});
				} else {
					resolve(this._repoDeleteResource(uri));
				}
			} else {
				this._isOnline = null;
				reject(this._createError(uri));
			}		
		break;
		default:
			console.log ("WARNING: Unsupported HTTP response.");
	}
}

RestOff.prototype._dbGet = function(uri, resolve, reject) {
	var request = uri.request;
	switch (request.status) {
		case 200:
			this._isOnline = true;
			return this._repoAdd(uri, request.response).then(function(result) {
				resolve(result);
			});
		break;
		case 0: case 404:
			var clientOnly = uri.options.clientOnly;
			if (uri.options.forcedOffline || clientOnly) {
				if (!clientOnly) {
					this._isOnline = false;
				}
				resolve(this._repoGet(uri));
			} else {
				this._isOnline = 0 !== request.status ? true : null; // TODO: Write test for this line of code
				reject(this._createError(uri));
			}
		break;
		default:
			console.log ("WARNING: Unsupported HTTP response.");
	}
}

RestOff.prototype._pendingRepoAdd = function(uri, clientOnly,resolve, reject) {
	if (!clientOnly) {
		var that = this;
		return this._pendingAdd(uri).then(function(result) {
			return that._repoAddResource(uri).then(function(result) {
				resolve(result);
			});
		});
	} else {
		return this._repoAddResource(uri).then(function(result) {
			resolve(result);
		});
	}
}

RestOff.prototype._dbPost = function(uri, resolve, reject) {
	var request = uri.request;
	switch (request.status) {
		case 201:
			this._isOnline = true;
			return this._repoAddResource(uri).then(function(result) {  // TODO: IMPORTANT!!! Use request.response: need to add backend service to test this
				resolve(result);
			});
		break;
		case 0: case 404:
			var clientOnly = uri.options.clientOnly;
			if (uri.options.forcedOffline || clientOnly) {
				if (!clientOnly) { // TODO: Add test for this
					this._isOnline = false;
				}
				this._pendingRepoAdd(uri, clientOnly, resolve, reject);
			} else {
				this._isOnline = 0 !== request.status ? true : null;  // TODO: Write test for this line of code
				reject(this._createError(uri));
			}
		break;
		default:
			console.log ("WARNING: Unsupported HTTP response.");
	}
}

RestOff.prototype._dbPut = function(uri, resolve, reject) {
	var request = uri.request;
	switch (request.status) {
		case 200:
			this._isOnline = true;
			resolve(this._repoAddResource(uri)); // TODO: IMPORTANT!!! Use request.response: need to add backend service to test this
		break;
		default:
			var finalStatus = request.status;
			var finalMessage = request.statusText;
			this._isOnline = 0 !== request.status ? true : null;
			var clientOnly = uri.options.clientOnly;
			if (uri.options.forcedOffline || clientOnly) { // we are offline, but resource not found so 404 it.
				if (!clientOnly) { // TODO: Add test for this
					this._isOnline = false;
				}
				if (this._repoFind(uri)) { // offline but found resource on client so add it
					this._pendingRepoAdd(uri, clientOnly, resolve, reject);
				} else {
					uri.request.status = 404;
					uri.request.statusText = "Not Found";
					reject(this._createError(uri));
				}
			} else {
				this._isOnline = 0 !== request.status ? true : null; // TODO: Write test for this line of code
				reject(this._createError(uri));
			}
	}
}

RestOff.prototype._restCall = function(uriClient, restMethod, options, resource) {
	var that = this;
	return new Promise(function(resolve, reject) {
		var uri = that.uriFromClient(uriClient, restMethod, resource, options);
		var request = that._requestGet(uri);
		var body = JSON.stringify(resource);
		request.open(uri.restMethod, uri.uriFinal, true); // true: asynchronous
		that._requestHeaderSet(request);
		request.onreadystatechange = function() {
			if(4 === request.readyStateRestOff) { // Done = 4
				that._uriAddRequest(uri, request);
				switch(uri.restMethod) {
					case "GET":
						that._dbGet(uri, resolve, reject);
					break;
					case "POST":
						that._dbPost(uri, resolve, reject);
					break;
					case "PUT":
						that._dbPut(uri, resolve, reject);
					break;
					case "DELETE":
						that._dbDelete(uri, resolve, reject);				
					break;
					// default: Not required
				}
			} // else ignore other readyStates
		};
		if (("POST" === uri.restMethod) || ("PUT" === uri.restMethod)) {
			request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			request.send(body);
		} else {
			request.send();
		}
	});
}

RestOff.prototype.delete = function(uri, options) {
	return this._restCall(uri, "DELETE", options);
}

RestOff.prototype.get = function(uri, options) {
	return this._restCall(uri, "GET", options);
}

RestOff.prototype.post = function(uri, resource, options) {
	return this._restCall(uri, "POST", options, resource);
}

RestOff.prototype.put = function(uri, resource, options) {
	return this._restCall(uri, "PUT", options, resource);
}

restlib.restoff = restoff; 