function restoff(config) {
	var that = Object.create(RestOff.prototype);
	that._isOnline = that.ONLINE_UNKNOWN;
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

RestOff.prototype.ONLINE_UNKNOWN = -1;
RestOff.prototype.ONLINE = 1;
RestOff.prototype.ONLINE_NOT = 0;

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
	var repoName = this.repoNameFrom(uri);
	this._repo[repoName] = JSON.parse(result);
	// TODO: Check for non-json result
	return this._repo[repoName];
}

RestOff.prototype.repoClearCache = function(repoName) {
	if (undefined !== this._repo[repoName]) {
		this._repo[repoName] = {};
	}
}

RestOff.prototype.clearCache = function() {
	var that = this;
	Object.keys(this.repository).forEach(
		function(value) {
			that._repo[value] = {};
		}
	);
}

RestOff.prototype.get = function(uri) {
	var that = this;
	var promise = new Promise(function(resolve, reject) {
		var request = that.getRequest;
		request.open("GET", uri, true); // true: asynchronous
		request.onreadystatechange = function(){
			if(request.__proto__.DONE === request.readyState2 ) {
				if(request.__proto__.UNSENT === request.status) {
					that.isOnline = that.ONLINE_NOT; // TODO: Write a test to cover this line of code
					var repoName = that.repoNameFrom(uri);
					if (undefined === that.repository[repoName]) {
						that.repoAdd(uri, "{}"); // offline and first call to the endpoint made
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
					// console.log("Current user %O", errorMessage);
					reject(errorMessage);
				}
			} // else ignore other readyStates
		};
		request.send();
	});
	return promise;
}
restlib.restoff = restoff;
