// restoff.js
// version: 0.0.13
// author: ProductOps
// license: Copyright (C) 2016 ProductOps
(function() {
"use strict";

var root = this; // window (browser) or exports (server)
var restlib = root.restlib || {}; // merge with previous or new module
restlib["version-library"] = '0.0.13'; // version set through gulp build

// export module for node or the browser
if (typeof module !== 'undefined' && module.exports) {
	module.exports = restlib;
} else {
	root.restlib = restlib;
}
function restoff(config) {
	var that = Object.create(RestOff.prototype);
	that._isOnline = that.ONLINE_UNKNOWN;
	that._forcedOffline = false;
	that._repo = {};
	that._autoParams = {};
	that._autoHeaders = {};

	that._rootUri = (undefined !== config) ? config.rootUri ? config.rootUri : "" : "";
	that._dbName = (undefined !== config) ? config.dbName ? config.dbName : "restoff.json" : "restoff.json";

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
	isForcedOffline: {
		get: function() { return this._forcedOffline; }
	},
	repository: { get: function() { return this._repo; }},
	isOnline: {
		get: function() { return this._isOnline; },
		set: function(value) { this._isOnline = value; }
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

RestOff.prototype.ONLINE_UNKNOWN = null;
RestOff.prototype.ONLINE = true;
RestOff.prototype.ONLINE_NOT = false;

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

RestOff.prototype.repoNameFrom = function(uri) {
	var rootUri = this.rootUri;

	if ("" === rootUri) {
		var url = document.createElement('a');
		url.href = uri;
		rootUri = url.protocol + "//" + url.hostname + (url.port ? ':' + url.port : "");
	}

	var repoName = uri.replace(rootUri, "");
	if ("/" == repoName[0]) {
		repoName = repoName.slice(1,repoName.length);
	}
	return repoName;
}

RestOff.prototype.repoAdd = function(uri, result) {
	var obj = JSON.parse(result);
	// TODO: Check for non-json result
	return this.repoAddObject(uri, obj);
}

RestOff.prototype.repoAddObject = function(uri, obj) {
	var repoName = this.repoNameFrom(uri);
	if (obj instanceof Array) {
		// TODO: There is no consolodiation at this time but will come soonish.
		this._repo[repoName] = obj
	} else {
		if (undefined === this._repo[repoName]) {
			this._repo[repoName] = [];
		}
		this._repo[repoName].push(obj);
	}
	return this._repo[repoName];
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
		request.open("GET", that.uriGenerate(uri), true); // true: asynchronous // TODO: Write a test to cover that.uriGenerate(uri) if possible
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
						// that.isOnline = that.ONLINE_NOT; // TODO: Write a test to cover this line of code
					var repoName = that.repoNameFrom(uri);
					if (undefined === that.repository[repoName]) {
						that.repoAddObject(uri, []); // offline and first call to the endpoint made
					}
					resolve(that.repository[repoName]);
				} else if(200 === request.status) {
					that.isOnline = that.ONLINE;
					resolve(that.repoAdd(uri, request.response));
				} else {
					var errorMessage = {
						"message" : request.statusText,
						"messageDetail" : request.responseText.replace(/\r?\n|\r/g, ""),
						"status": request.status
					};
					reject(errorMessage);
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
		var body = JSON.stringify(object);

		request.open("POST", that.uriGenerate(uri), true);
		request.onreadystatechange = function() {
			// console.log(request);
			if(request.__proto__.DONE === request.readyState2 ) {
				var repoName = that.repoNameFrom(uri);
				resolve(that.repoAddObject(uri, body));
			} else {
				reject("TODO: Add test for this line of code");
			}
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
			// console.log(request);
			if(request.__proto__.DONE === request.readyState2 ) {
				resolve("What happened?");
			}
		};
		request.send();
	});
	return promise;
}

restlib.restoff = restoff;


}.call(this));