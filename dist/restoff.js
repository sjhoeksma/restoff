// restoff.js
// version: 0.0.7
// author: ProductOps
// license: Copyright (C) 2016 ProductOps
(function() {
"use strict";

var root = this; // window (browser) or exports (server)
var restlib = root.restlib || {}; // merge with previous or new module
restlib["version-library"] = '0.0.7'; // version set through gulp build

// export module for node or the browser
if (typeof module !== 'undefined' && module.exports) {
	module.exports = restlib;
} else {
	root.restlib = restlib;
}
function restoff(config) {
	var that = Object.create(RestOff.prototype);
	that._isOnline = false;
	that._forcedOffline = false;
	that._repo = {};

	if (config) {
		that._rootUri = config.rootUri ? config.rootUri : "";
	} else {
		that._rootUri = "";
	}

	return that;
}

function RestOff() {}
RestOff.prototype = Object.create(Object.prototype, {
	rootUri: {
		get: function() { return this._rootUri; },
		set: function(value) { this._rootUri = value; }
	},
	isForcedOffline: {
		get: function() { return this._forcedOffline; }
	},
	forcedOffline: {
		set: function(value) {
			this._forcedOffline = true;
			this._isOnline = false;
		}
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

			// ForcedOffline overrides send() which now simply calls onreadystatechange
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

RestOff.prototype.repoAdd = function(uri, result) {
	var url = document.createElement('a');
	url.href = uri;
	var repoName = url.pathname.replace(this.rootUri, "");
	if ("/" == repoName[0]) {
		repoName = repoName.slice(1,repoName.length);
	}
	this._repo[repoName] = result;
}

RestOff.prototype.get = function(uri) {
	var that = this;
	var promise = new Promise(function(resolve, reject) {
		var request = that.getRequest;
		request.open("GET", uri, true); // true: asynchronous
		request.onreadystatechange = function(){
			if(request.__proto__.DONE == request.readyState2 ) { // 4: Request finished and response is ready
				if(request.__proto__.UNSENT == request.status) {
					var offlineData = {
						"offlineData": true
					};
					resolve(offlineData);
				} else if(200 == request.status) {
					that.isOnline = true;
					that.repoAdd(uri, request.response);
					resolve(JSON.parse(request.response));
					// TODO: Check for non-json result
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
		// TODO: Figure out how to stop 404 (Not Found)
		//       message in log. Tried surrounding with try/catch
		//       and removing strict.
		request.send();
	});
	return promise;
}
restlib.restoff = restoff;


}.call(this));