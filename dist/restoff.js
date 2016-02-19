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
	return Object.create(RestOff.prototype);
}

function RestOff() {}
RestOff.prototype = Object.create(Object.prototype, {
	isOnline: {
		get: function() {
			return true;
		}
	}
});
RestOff.prototype.get = function(uri) {
	var promise = new Promise(function(resolve, reject) {
		var _xhr;
		if (window.XMLHttpRequest) { // Mozilla, Safari, ...
			_xhr = new XMLHttpRequest();
		} else if (window.ActiveXObject) { // IE 8 and older
			_xhr = new ActiveXObject("Microsoft.XMLHTTP");
		}

		_xhr.open("GET", uri, true); // true = asynchronous. synchronous on main thread is deprecated
		_xhr.onload = function(){
			if(_xhr.readyState == 4) {
				if(_xhr.status == 200) {
					resolve(JSON.parse(_xhr.response)); // success: resolve promise
				} else {
					reject(new Error("something went wrong")); // error: reject promise
				}
			}
		}
		_xhr.onerror = function(error){
			reject(error);
		}
		_xhr.send();
	});
	return promise;
}
restlib.restoff = restoff;


}.call(this));