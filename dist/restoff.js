// restoff.js
// version: 0.0.1
// author: ProductOps
// license: Copyright (C) 2016 ProductOps
(function() {
"use strict";

var root = this; // window (browser) or exports (server)
var restlib = root.restlib || {}; // merge with previous or new module
restlib["version-library"] = '0.0.1'; // version set through gulp build

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
			return false;
		}
	}
});
restlib.restoff = restoff;


}.call(this));