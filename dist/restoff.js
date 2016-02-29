// restoff.js
// version: 0.0.22
// author: ProductOps
// license: Copyright (C) 2016 ProductOps
(function() {
"use strict";

var root = this; // window (browser) or exports (server)
var restlib = root.restlib || {}; // merge with previous or new module
restlib["version-library"] = '0.0.22'; // version set through gulp build

// export module for node or the browser
if (typeof module !== 'undefined' && module.exports) {
	module.exports = restlib;
} else {
	root.restlib = restlib;
}
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
	}
});

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

RestOff.prototype.uriRec = function(uri, restMethod, resources) {
	var uriResult = {
		uri: uri,
		primaryKey : "",
		uriFinal : this.uriGenerate(uri),
		primaryKeyName : this.primaryKeyName,
		restMethod : restMethod,
		resources : resources
	};

	var result = uri.replace(this.rootUri, "");

	var search = result.split("?");
	if (search.length > 1) {
		result = search[0];
		uriResult.search = search[1]
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
	return uriResult;
}

RestOff.prototype.primaryKeyFor = function(resource) {
	var result = resource[this.primaryKeyName];
	if (undefined === resource[this.primaryKeyName]) {
		
		console.log("Warning: resource %O did not have a primaryKey ", resource); // TODO: Write tests for this
	}
	return result;
}


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

RestOff.prototype.forceOffline = function(resource) {
	this._forcedOffline = true;
	this._isOnline = null;
	return this;
}

RestOff.prototype.repoGet = function(uriRec) {
	var query;
	if ("" !== uriRec.primaryKey) {
		query = {};
		query[uriRec.primaryKeyName] = uriRec.primaryKey;
	}

	return this.persistanceDisabled ? [] : this.dbRepo.read(uriRec.repoName, query);
}

RestOff.prototype.repoFind = function(uriRec) {
	return this._dbRepo.find(uriRec.repoName, uriRec.primaryKeyName, uriRec.primaryKey)	
}

RestOff.prototype.repoAdd = function(uriRec, resourceRaw) {
	uriRec.resources = JSON.parse(resourceRaw); // TODO: Check for non-json result and throw error/convert/support images/etc.
	return this.repoAddResource(uriRec);
}


RestOff.prototype.repoAddResource = function(uriRec) {
	var resourceArray = (uriRec.resources instanceof Array) ? uriRec.resources : [uriRec.resources]; // make logic easier
	if (!this.persistanceDisabled) {
		var that = this;
		// TODO: Check for soft deletes so we don't need to get all the records from the database
		if (("" === uriRec.primaryKey) && ("GET" === uriRec.restMethod)) {  // Complete get, doing a merge because we don't have soft_delete
		     this.clear(uriRec.repoName); // TODO: What do we do when there are pending changes
		}
		resourceArray.forEach(function(resource) {
			var primaryKey = that.primaryKeyFor(resource);
			that.dbRepo.write(uriRec.repoName, that.primaryKeyName, primaryKey, resource);
		});
	} // else don't persist
	return uriRec.resources;
}

RestOff.prototype.repoDeleteResource = function(uriRec) {
	if (!this.persistanceDisabled) {
    	this.dbRepo.delete(uriRec.repoName, uriRec.primaryKeyName, uriRec.primaryKey);
	}
}

RestOff.prototype.createError = function(uriR, responseText, uri, status, message) {
	var request = uriR.request;
	var messageDetail = request.responseText.replace(/\r?\n|\r/g, "");
	var message = request.statusText;

	if (0 === request.status) {
		message = "Network Error";
	}

	return {
		"message" : message,
		"messageDetail" : messageDetail,
		"status": request.status,
		"uri": uriR.uriFinal
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
RestOff.prototype.pendingAdd = function(uriRec) {
	var result = {
		"restMethod" : uriRec.restMethod,
		"resources" : uriRec.resources,
		"clientTime" : new Date(),
		"uri" : uriRec.uriFinal,
		"repoName" : uriRec.repoName
	}
	if (!this.persistanceDisabled) {
		this._pending.push(result);
	}
	return result;
}

RestOff.prototype._requestHeaderSet = function(request) {
	var autoHeaders = this._autoHeaders;
	Object.keys(autoHeaders).forEach(
		function(key) {
			request.setRequestHeader(key, autoHeaders[key]); // TODO: Write a test to cover this
		}
	);
}

RestOff.prototype._uriAddRequest = function(uriR, request) {
	uriR.request = {
		readyState : request.readyState2,
		status : request.status,
		statusText : request.statusText,
		response: request.response,
		responseText: request.responseText
	};
	return uriR;
}

RestOff.prototype._dbDelete = function(uriR, resolve, reject) {
	var request = uriR.request;
	switch (request.status) {
		case 200: case 202: case 204: // TODO: Write test for 202 and 204
			this._isOnline = true;
			this.repoDeleteResource(uriR);
			resolve();
		break;
		case 404:
			this._isOnline = true;
			this.repoDeleteResource(uriR); // 404 but will remove from client anyway
			resolve();
		break;
		case 0:
			if (this.isForcedOffline) {
				this._isOnline = false;
				this.pendingAdd(uriR);
				this.repoDeleteResource(uriR);
				resolve();
			} else {
				this._isOnline = null;
				reject(this.createError(uriR));
			}		
		break;
		default:
			console.log ("WARNING: Unsupported HTTP response.");
	}
}

RestOff.prototype._dbGet = function(uriR, resolve, reject) {
	var request = uriR.request;
	switch (request.status) {
		case 200:
			this._isOnline = true;
			resolve(this.repoAdd(uriR, request.response));
		break;
		case 0: case 404:
			if (this.isForcedOffline) {
				this._isOnline = false;
				resolve(this.repoGet(uriR));
			} else {
				this._isOnline = 0 !== request.status ? true : null; // TODO: Write test for this line of code
				reject(this.createError(uriR));
			}
		break;
		default:
			console.log ("WARNING: Unsupported HTTP response.");
	}
}

RestOff.prototype._dbPost = function(uriR, resolve, reject) {
	var request = uriR.request;

	var request = uriR.request;
	switch (request.status) {
		case 201:
			this._isOnline = true;
			resolve(this.repoAddResource(uriR)); // TODO: IMPORTANT!!! Use request.response: need to add backend service to test this
		break;
		case 0: case 404:
			if (this.isForcedOffline) {
				this._isOnline = false;
				this.pendingAdd(uriR);
				resolve(this.repoAddResource(uriR));
			} else {
				this._isOnline = 0 !== request.status ? true : null;  // TODO: Write test for this line of code
				reject(this.createError(uriR));
			}
		break;
		default:
			console.log ("WARNING: Unsupported HTTP response.");
	}
}

RestOff.prototype._dbPut = function(uriR, resolve, reject) {
	var request = uriR.request;
	switch (request.status) {
		case 200:
			this._isOnline = true;
			resolve(this.repoAddResource(uriR)); // TODO: IMPORTANT!!! Use request.response: need to add backend service to test this
		break;
		default:
			var finalStatus = request.status;
			var finalMessage = request.statusText;
			this._isOnline = 0 !== request.status ? true : null;
			if (this.isForcedOffline) { // we are offline, but resource not found so 404 it.
				this._isOnline = false;
				if (this.repoFind(uriR)) { // offline but found resource on client so add it
					this.pendingAdd(uriR);
					resolve(this.repoAddResource(uriR));
				} else {
					uriR.request.status = 404;
					uriR.request.statusText = "Not Found";
					reject(this.createError(uriR));
				}
			} else {
				this._isOnline = 0 !== request.status ? true : null; // TODO: Write test for this line of code
				reject(this.createError(uriR));
			}

	}
}

RestOff.prototype._restCall = function(uri, restMethod, resource) {
	var that = this;
	var promise = new Promise(function(resolve, reject) {
		var request = that.getRequest;
		var uriR = that.uriRec(uri, restMethod, resource);
		var body = JSON.stringify(resource);
		request.open(uriR.restMethod, uriR.uriFinal, true); // true: asynchronous
		that._requestHeaderSet(request);
		request.onreadystatechange = function() {
			if(4 === request.readyState2) { // Done = 4
				that._uriAddRequest(uriR, request);
				switch(uriR.restMethod) {
					case "GET":
						that._dbGet(uriR, resolve, reject);
					break;
					case "POST":
						that._dbPost(uriR, resolve, reject);
					break;
					case "PUT":
						that._dbPut(uriR, resolve, reject);
					break;
					case "DELETE":
						that._dbDelete(uriR, resolve, reject);				
					break;
					// default: Not required
				}
			} // else ignore other readyStates
		};
		if (("POST" === uriR.restMethod) || ("PUT" === uriR.restMethod)) {
			request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			request.send(body);
		} else {
			request.send();
		}
	});
	return promise;
}

RestOff.prototype.delete = function(uri) {
	return this._restCall(uri, "DELETE");
}

RestOff.prototype.get = function(uri) {
	return this._restCall(uri, "GET");
}

RestOff.prototype.post = function(uri, resource) {
	return this._restCall(uri, "POST", resource);
}

RestOff.prototype.put = function(uri, resource) {
	return this._restCall(uri, "PUT", resource);
}

restlib.restoff = restoff; 
function lowdbRepo(config) {
	var that = Object.create(LowdbRepo.prototype);
	that._dbName = (undefined !== config) ? config.dbName ? config.dbName : "restoff" : "restoff";
	that._low = low(that._dbName, { storage: low.localStorage }); // local storage	
	return that;
}

function LowdbRepo() {}
LowdbRepo.prototype = Object.create(Object.prototype, {
	dbName: {
		get: function() { return this._dbName; },
		set: function(value) { this._dbName = value; }
	},
	dbEngine: { get: function() { return this._low; }},
	deleteSomeTime: { get: function() { return this._isOnline === true; }}
});

restlib.lowdbRepo = lowdbRepo;

LowdbRepo.prototype.length = function(repoName) {
	return this._low(repoName).size();
}

LowdbRepo.prototype.clear = function(repoName) {
	delete this._low.object[repoName];
	this._low.write()
}

LowdbRepo.prototype.clearAll = function() {
	this._low.object = {};
	this._low.write();
}

LowdbRepo.prototype.find = function(repoName, keyName, primaryKey) {
	var query = {};
	query[keyName] = primaryKey;
	return this._low(repoName).find(query);
}

LowdbRepo.prototype.read = function(repoName, query) {
	if ((undefined !== query) && (null !== query)) {
		return this._low(repoName).find(query);
	} else {
		return this._low(repoName).value();
	}
}

LowdbRepo.prototype.write = function(repoName, keyName, primaryKey, resource) {
	// TODO: There is no consolodiation at this time
	//       So, right now, we overwrite whatever is there without
	//       verifying anything has changed.
	if (undefined === this.find(repoName, keyName, primaryKey)) {
		this._low(repoName).push(resource);
	} else {
		var query = {};
		query[keyName] = primaryKey;
		this.dbEngine(repoName)
			.chain()
	  		.find(query)
			.assign(resource)
			.value();
	}
}

LowdbRepo.prototype.delete = function(repoName, keyName, primaryKey) {
	var query = {};
	query[keyName] = primaryKey;
	return this._low(repoName).remove(query);
}


}.call(this));