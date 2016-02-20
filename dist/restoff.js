// restoff.js
// version: 0.0.6
// author: ProductOps
// license: Copyright (C) 2016 ProductOps
(function() {
"use strict";

var root = this; // window (browser) or exports (server)
var restlib = root.restlib || {}; // merge with previous or new module
restlib["version-library"] = '0.0.6'; // version set through gulp build

// export module for node or the browser
if (typeof module !== 'undefined' && module.exports) {
	module.exports = restlib;
} else {
	root.restlib = restlib;
}
function restoff() {
	var that = Object.create(RestOff.prototype);
	that._isOnline = false;
	return that;
}

function RestOff() {}
RestOff.prototype = Object.create(Object.prototype, {
	isOnline: {
		get: function() { return this._isOnline; },
		set: function(value) { this._isOnline = value; }
	},
	getRequest: {
		get: function() {
			return window.XMLHttpRequest ?
				new XMLHttpRequest() : // Mozilla, Safari, ...
				new ActiveXObject("Microsoft.XMLHTTP"); // IE 8 and older
		}
	}
});
RestOff.prototype.get = function(uri) {
	var that = this;
	var promise = new Promise(function(resolve, reject) {
		var request = that.getRequest;
		request.open("GET", uri, true); // true: asynchronous
		request.onload = function(){
			if(request.readyState == 4) { // 4: Request finished and response is ready
				if(request.status == 200) {
					that.isOnline = true;
					resolve(JSON.parse(request.response));
					// TODO: Check for non-json result
				} else {
					reject(new Error("something went wrong"));
				}
			} else {
				console.log("Warning: unexpected readyState of " + request.readyState + ".");
			}
		}
		request.onerror = function(error){
			reject(error);
		}
		request.send();
	});
	return promise;
}
restlib.restoff = restoff;


}.call(this));