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
function restoff() {
	var that = Object.create(RestOff.prototype);
	that._isOnline = false;
	that._forcedOffline = false;
	return that;
}

function RestOff() {}
RestOff.prototype = Object.create(Object.prototype, {
	isForcedOffline: {
		get: function() { return this._forcedOffline; }
	},
	forcedOffline: {
		set: function(value) {
			this._forcedOffline = true;
			this._isOnline = false;
		}
	},
	isOnline: {
		get: function() { return this._isOnline; },
		set: function(value) { this._isOnline = value; }
	},
	getRequest: {
		get: function() {
			var request = window.XMLHttpRequest ?
				new XMLHttpRequest() : // Mozilla, Safari, ...
				new ActiveXObject("Microsoft.XMLHTTP"); // IE 8 and older

			// ForcedOffline overrides send to simply jump to onreadystatechange
			// We use readyState2 and override it to trick the request into
			// thinking it is complete. Why readyState2? Because readyState
			// has no setter
			if (this.isForcedOffline) {
				request.__defineGetter__('readyState2', function(){return 4;});
				request.send = function() { this.onreadystatechange(); }
			} else {
				request.__defineGetter__('readyState2', function(){ return this.readyState; });
			}
			return request;
		}
	}
});
RestOff.prototype.get = function(uri) {
	var that = this;
	var promise = new Promise(function(resolve, reject) {
		var request = that.getRequest;
		request.open("GET", uri, true); // true: asynchronous
		request.onreadystatechange = function(){
			if(request.__proto__.DONE == request.readyState2 ) { // 4: Request finished and response is ready
				if(request.status == 0) {
					var offlineData = {
						"offlineData": true
					};
					resolve(offlineData);
				} else if(request.status == 200) {
					that.isOnline = true;
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
		request.send();
	});
	return promise;
}
restlib.restoff = restoff;


}.call(this));