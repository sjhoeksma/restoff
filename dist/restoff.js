// restoff.js
// version: 0.2.29
// author: ProductOps <restoff@productops.com>
// license: MIT
(function() {
"use strict";

var root = this; // window (browser) or exports (server)
var restlib = root.restlib || {}; // merge with previous or new module
restlib["version-library"] = '0.2.29'; // version set through gulp build

// export module for node or the browser
if (typeof module !== 'undefined' && module.exports) {
	module.exports = restlib;
} else {
	root.restlib = restlib;
}

function lowdbRepo(config) {
	var defaultConfig = {
		dbName: "restoff.json"
	};

	var that = Object.create(LowdbRepo.prototype);
	that._options = Object.assign(defaultConfig, config);

	var low = root && root.low ? root.low : undefined;
	var _format = that._options.format;

	if (typeof module !== 'undefined' && module.exports) {
		low = require('lowdb');
		var storage = require('lowdb/file-sync');
		that._low = low(that.dbName, _format ? { storage: storage, format: _format } : { storage: storage }); // file storage
	} else {
		if (typeof low !== 'undefined') {
			that._low = low(that.dbName, _format ? { storage: low.localStorage, format: _format } : { storage: low.localStorage }); // local storage
		} else {
			throw new Error ("LowDb library required. Please see README.md on how to get this library.");
		}
	}

	return that;
}

function LowdbRepo() {}
LowdbRepo.prototype = Object.create(Object.prototype, {
	dbName: {
		get: function() { return this.options.dbName; },
		set: function(value) { this.options.dbName = value; }
	},
	dbEngine: { get: function() { return this._low; }},
	options: { get: function() { return this._options; }}
});

restlib.lowdbRepo = lowdbRepo;

LowdbRepo.prototype.length = function(repoName) {
	return this._low(repoName).size();
};

LowdbRepo.prototype.clear = function(repoName) {
	delete this._low.object[repoName];
	this._low.write()
};

LowdbRepo.prototype.clearAll = function() {
	this._low.object = {};
	this._low.write();
};

LowdbRepo.prototype.find = function(repoName, keyName, primaryKey) {
	var query = {};
	query[keyName] = primaryKey;
	return this._low(repoName).find(query);
};

LowdbRepo.prototype.read = function(repoName, query) {
	return this._low(repoName)
		.chain()
		.filter(query)
		.value();
};

LowdbRepo.prototype.write = function(repoName, keyName, resource) {
	var primaryKey = resource[keyName];
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
};

LowdbRepo.prototype.delete = function(repoName, query) {
	this._low(repoName).remove(query);
};

function logMessage(message) {
    console.log(message);
}

function deepEquals(x, y) {
    if ((typeof x == "object" && x !== null) && (typeof y == "object" && y !== null)) {
	      if (Object.keys(x).length != Object.keys(y).length) {
            return false;
        }

        for (var prop in x) {
							if (y.hasOwnProperty(prop)) {
									if (! deepEquals(x[prop], y[prop])) {
											return false;
									}
							}
							else {
									return false;
							}
        }
        return true;
    } else return x === y;
}

// TODO: Maybe use a library. See http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function uuidGenerate() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

function restoffService(config) {
	var defaultConfig = {
		primaryKeyName: "id",
		dbName: "restoff.json",
		repoOptions: [],
		reconSettings: {
			lastUpdatedFieldName: "",
			softDeleteFieldName: "",
			softDeleteValue: ""
		}
	};
	var that = Object.create(RestOffService.prototype);
	that._options = Object.assign(defaultConfig, config);
	that._dbRepo = lowdbRepo(that._options);
	return that;
}

function RestOffService() {}
RestOffService.prototype = Object.create(Object.prototype, {
	dbName: {
		get: function() { return this.options.dbName; },
		set: function(value) { this.options.dbName = value; }
	},
	dbRepo: { get: function() { return this._dbRepo; }},
	lastUpdatedFieldName: {
		get: function() { return this._options.reconSettings.lastUpdatedFieldName; }
	},
	options: { get: function() { return this._options; }},
	primaryKeyName: {
		get: function() { return this.options.primaryKeyName; },
		set: function(value) { this.options.primaryKeyName = value; }
	},
	reconSettings: {
		get: function() { return this._options.reconSettings; },
		set: function(value) { this._options.reconSettings = value; }
	},
	softDeleteFieldName: {
		get: function() { return this._options.reconSettings.softDeleteFieldName; }
	},
	softDeleteValue: {
		get: function() { return this._options.reconSettings.softDeleteValue; }
	}
});

RestOffService.prototype.pkNameGet = function(repoName, options) {
	var pkName = this.primaryKeyName; // start global
	var repoOptions = this.repoOptionsGet(repoName);
	if (undefined !== repoOptions) { // overwrite with repo level
		pkName = repoOptions.primaryKeyName;
	}
	if ((undefined !== options) && (undefined !== options.primaryKeyName)) { // override at specific level
		pkName = options.primaryKeyName;
	}
	return pkName;
};

RestOffService.prototype.repoOptionsGet = function(repoName) {
	var result;
	this.options.repoOptions.forEach(function(item) {
		if (item.repoName === repoName) {
			result = item;
		}
	});
	return result;
};

RestOffService.prototype.repoOptionsSet = function(options) {
	var that = this;
	this.options.repoOptions.forEach(function(item, pos) {
		if (item.repoName === options.repoName) {
			that.options.repoOptions.splice(pos,1);
		}
	});
	this.options.repoOptions.push(options);
	return this;
};

RestOffService.prototype.clear = function(repoName) {
	return this.dbRepo.clear(repoName);
};

RestOffService.prototype.clearAll = function() {
	return this.dbRepo.clearAll();
};

RestOffService.prototype.deleteRepo = function(repoName, query) {
	return this.dbRepo.delete(repoName, query);
};

RestOffService.prototype.findSync = function(repoName, query) {
	return this.dbRepo.read(repoName, query);
};

RestOffService.prototype.writeSync = function(repoName, resources, options) {
	var that = this;
	var pkName = this.pkNameGet(repoName, options);
	var updatedField = this.lastUpdatedFieldName;
	resources = (resources instanceof Array) ? resources : [resources]; // make logic easier
	resources.forEach(function(resource) {
		var primaryKey = resource[pkName];
		if (undefined === primaryKey) {
			// TODO: Provide a call back for logging so user can log/notify/etc.
			// TODO: Allow Program to continue execution?
			throw new Error("Expected resource in repository '" + repoName + "' to have a primary key named '" + pkName + "'. The resource we are checking against is " + JSON.stringify(resource) + ". The primary key name comes from the global configuration or you can set it for each RESTful call. Please see supporting documentation.");
		}
	});

	if (this.reconSettings.softDeleteFieldName) {
		var softDeleteFN = this.reconSettings.softDeleteFieldName;
		var softDeleteFV = this.reconSettings.softDeleteValue;
		resources.forEach(function(resource, pos) {
			if (resource[softDeleteFN] !== softDeleteFV) {
				that.dbRepo.write(repoName, pkName, resource);
			} else { // deleted: don't add to repo and remove from resources
				resources.splice(pos,1);
			}
		});

	} else {
		resources.forEach(function(resource) {
			that.dbRepo.write(repoName, pkName, resource);
		});
	}
	return resources;
};

restlib.restoffService = restoffService;

function restoffUri(restOff, options) {
    var defaultOptions = {
        filter: []
    };

    var that = Object.create(RestoffUri.prototype);
    that._options = Object.assign(defaultOptions, options);
    that._restOff = restOff;
    return that;
}

function RestoffUri() {}
RestoffUri.prototype = Object.create(Object.prototype, {
    filter: {
        get: function() {
            return this._options.filter;
        }
    }
});

RestoffUri.prototype._uriGenerate = function(uri) {
    var result = uri.uri;
    if (result.indexOf("http") === -1) { // missing domain/protocol/etc.
        result = uri.options.rootUri + result;
    }
    var autoParams = this._restOff._autoParams;
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
};

RestoffUri.prototype.uriFromClient = function(uri, restMethod, resources, options, useOriginalUri) {
    var uriResult = {
        uri: uri,
        primaryKey : "",
        restMethod : restMethod,
        resources : resources,
        options : Object.assign({}, this._restOff._options, options),
        searchOptions : {}
    };

    if (!uriResult.options.rootUri.endsWith("/")) {
        uriResult.options.rootUri = uriResult.options.rootUri + "/";
    }
   uriResult.uriFinal = useOriginalUri ? uri : this._uriGenerate(uriResult);
    var result = uri.replace(uriResult.options.rootUri, "");

    this.filter.forEach(function(item) { // remove unwanted parts from the uri.
        result = result.replace(item, "");
    });

    var search = result.split("?");
    if (search.length > 1) {
        result = search[0];
        uriResult.search = search[1];
        uriResult.search.split("&").forEach(function(item) {
            var itemParts = item.split("=");
            if (2 === itemParts.length) {
                uriResult.searchOptions[itemParts[0]] = itemParts[1];
            } else {
                logMessage("WARNING: Invalid search query in uri " + uriResult.uriFinal + "'."); // TODO: Write Test for this.
            }
        });
    }

    var uriPrimaryKey = result.split("/");
	  if (options && options.hasPK && uriPrimaryKey.length > 1) {
			uriResult.primaryKey = uriPrimaryKey.pop(); 
			result =  uriPrimaryKey.join("/");	
		} 

    var pkName = this._restOff._pkNameGet(uriResult);
    uriResult.primaryKeyName = pkName;

	 if (undefined !== resources) {
     if (resources instanceof Array) {
				resources.forEach(function (item) {
						if (!item[pkName])  item[pkName] = uriResult.options.generateId();
				});
		 } else {
				if (!resources[pkName]) resources[pkName] = uriResult.options.generateId();
		 }
	 }

    // TODO: Check if resource's primary key != uri primary key and warn (some cases when this could happen)
    if (("" === uriResult.primaryKey) && (undefined !== resources) && (null !== resources) && (undefined !== resources[pkName])) {
        uriResult.primaryKey = resources[pkName];
    }

    if (options && options.repoName) {
        uriResult.repoName = options.repoName;
    } else {
        uriResult.repoName =  result;
    }
	
    if (("http:" === uriResult.repoName) || ("" === uriResult.repoName)) {
        // Note: We really can't figure out the rootUri from the uri provided when no rootUri was
        //       configured. This is because the rootUri could contain anything plus resource names
        // 	     and we don't know where the anything part stops and the resources start. So, we get
        //       this warning.
        logMessage("WARNING: repoName invalid. Had a uri of '" + uri + "' and a rootUri of '" + uriResult.options.rootUri + "'' which may be incorrect?");
    }
    return uriResult;
};
restlib.restoffUri = restoffUri;

function restoffPending(restOff, options) {
    var defaultOptions = {
        pendingUri: "http://localhost/",
        pendingRepoName: "pending"
    };

    var that = Object.create(RestoffPending.prototype);
    that._options = Object.assign(defaultOptions, options);
    that._restOff = restOff;
    return that;
}

function RestoffPending() {}
RestoffPending.prototype = Object.create(Object.prototype, {
    pendingRepoName: { get: function() { return this._options.pendingRepoName; }},
    pendingUri: { get: function() { return this._options.pendingUri; } }
});

RestoffPending.prototype.pendingGet = function(repoName, key) {
    var pendingUri = this.pendingRepoName + (repoName ? "?repoName=" + repoName : "");
    if (undefined !== key) {
      pendingUri += (repoName ? "&" : "?");
      pendingUri += "primaryKey=" + key; // in pending repo, the resources' primary key is always named "primaryKey"
    }
    return this._restOff.getRepo(pendingUri, {rootUri:this.pendingUri,clientOnly:true});
};

RestoffPending.prototype.pendingPost = function(resource) {
  return this._restOff.postRepo(this.pendingUri + this.pendingRepoName, resource, {rootUri:this.pendingUri,clientOnly:true,primaryKeyName:"id"});
};

RestoffPending.prototype.pendingCount = function(repoName) {
    var pending = this.pendingGet(repoName);
    return pending ? pending.length : 0;
};

RestoffPending.prototype.pendingDelete = function(itemId) {	
  	var uri = this.pendingRepoName + (itemId ? "/"+itemId : "");
    return this._restOff.deleteRepo(uri, {rootUri:this.pendingUri, clientOnly:true, primaryKeyName:"id",hasPK:!(!itemId)});
};

RestoffPending.prototype.pendingClear = function(repoName) {
    var uri = this.pendingRepoName + "?repoName=" + repoName;
    return this._restOff.deleteRepo(uri, {rootUri:this.pendingUri, clientOnly:true});
};

RestoffPending.prototype.pendingAdd = function(uri) {
    var result = {
        "id" : uuidGenerate(),
        "restMethod" : uri.restMethod,
        "resources" : uri.resources,
        "clientTime" : new Date(),
        "uri" : uri.uriFinal,
        "repoName" : uri.repoName,
        "primaryKey" : uri.primaryKey,
			  "hasPK": uri.options && uri.options.hasPK
    };
    if (!uri.options.persistenceDisabled) { // TODO: Write a test for this
        var pendingFound = this.pendingGet(uri.repoName, uri.primaryKey);
        if (1 === pendingFound.length) { // Already have a pending record? Use it's 'original' record then remove it from pending.
					if ("POST" === pendingFound[0].restMethod && "DELETE" !== uri.restMethod) {
						//We need to keep it the original post record
						result.restMethod="POST"; 
						result.hasPK=false;
						result.uri=pendingFound[0].uri;
					} else {
						if (undefined !== pendingFound[0].original) {
							result.original = JSON.parse(JSON.stringify(pendingFound[0].original)); // need to clone original record
						} else {
							result.original = JSON.parse(JSON.stringify(pendingFound[0].resources)); // need to clone original record
						}
					}
          this.pendingDelete(pendingFound[0].id);
        } else {
          var original = this._restOff.getRepo(uri.repoName+"/"+uri.primaryKey, {primaryKeyName:uri.primaryKeyName,hasPK:true});
          if (undefined !== original[0]) {
              result.original = JSON.parse(JSON.stringify(original[0])); // need to clone original record
          }
        }
        return this.pendingPost(result);
    } else {
        return result;
    }
};

restlib.restoffPending = restoffPending;

function restoff(options) {
	var defaultOptions = {
		rootUri: "",
		clientOnly: false,
		concurrency: 'optimistic',
		forcedOffline: false,
		persistenceDisabled: false,
		pending: {},
		uriOptions: {
			filter: []
		}
	};

	var that = Object.create(RestOff.prototype);
	that._options = Object.assign(defaultOptions, options);
	that._options.generateId = (options && options.generateId) ? options.generateId : uuidGenerate;
	that._autoParams = that._options.defaultParams || {};
	that._autoHeaders = that._options.defaultHeaders || {};
	delete that._options.defaultParams;
	delete that._options.defaultHeaders;
	that._dbService = restoffService(that._options.dbService);
	that._restoffUri = restoffUri(that, that._options.uriOptions);
	that._pendingService = restoffPending(that, that._options.pending);
	return that;
}

function RestOff() {}
RestOff.prototype = Object.create(Object.prototype, {
	dbService: { get: function() { return this._dbService; }},
	forcedOffline: {
		get: function() { return this._options.forcedOffline; },
		set: function(value) { this._options.forcedOffline = value; }
	},
	clientOnly: {
		get: function() { return this._options.clientOnly; },
		set: function(value) { this._options.clientOnly = value; }
	},
	concurrency: {
		get: function() { return this._options.concurrency; },
		set: function(value) { this._options.concurrency = value; }
	},
	options: {
		get: function() { return this._options; }
	},
	pendingService: { get: function() { return this._pendingService; }},
	persistenceDisabled: {
		get: function() { return this._options.persistenceDisabled; },
		set: function(value) { this._options.persistenceDisabled = value; }
	},
	restoffUri: {
		get: function() { return this._restoffUri; },
	},
	rootUri: {
		get: function() { return this._options.rootUri; },
		set: function(value) { this._options.rootUri = value; }
	},
	resourceFilter: {
		get: function() { return this._options.resourceFilter; },
		set: function(value) { this._options.resourceFilter = value; }
	},
	pageHandler: {
		get: function() { return this._options.pageHandler; },
		set: function(value) { this._options.pageHandler = value; }
	}
});

RestOff.prototype._pkNameGet = function(uri) {
	return this.dbService.pkNameGet(uri.repoName, uri.options);
};

RestOff.prototype._pendingRepoAddSync = function(uri) {
	if (!uri.options.clientOnly) { // TODO: Add test for this
		this.pendingService.pendingAdd(uri);
	}
	return this._repoAddResourceSync(uri);
};

RestOff.prototype._pendingRepoAdd = function(uri, clientOnly, resolve, reject) {
	if (!clientOnly) {
		var that = this;
		this.pendingService.pendingAdd(uri);	
		return that._repoAddResource(uri).then(function(result) {
			resolve(result);
		}).catch(function(error) { // TODO: Test
			reject(error);
		});
	} else {
		return this._repoAddResource(uri).then(function(result) {
			resolve(result);
		}).catch(function(error) { // TODO: Test
			reject(error);
		});
	}
};

RestOff.prototype._requestGet = function(uri) {
	var request = window.XMLHttpRequest ?
		new XMLHttpRequest() : // Mozilla, Safari, ...
		new ActiveXObject("Microsoft.XMLHTTP"); // IE 8 and older

	// ForceOffline overrides send() which now simply calls onreadystatechange
	// We use readyStateRestOff and override it to trick the request into
	// thinking it is complete. Why readyStateRestOff? Because readyState
	// has no setter (request.readyState = 4 throws an exception).
	if (uri.options.forcedOffline || uri.options.clientOnly) {
		request.__defineGetter__('readyStateRestOff', function(){return 4;}); // Done = 4
		request.send = function() { this.onreadystatechange(); };
	} else {
		request.__defineGetter__('readyStateRestOff', function(){ return this.readyState; });
	}
	return request;
};

RestOff.prototype.uriFromClient = function(uri, restMethod, resources, options, useOriginalUri) {
	return this._restoffUri.uriFromClient(uri, restMethod, resources, options, useOriginalUri);
};

RestOff.prototype.clearAll = function(force) {
	force = undefined === force ? false : force;
	var pendLength = this.pendingService.pendingCount();
	if ((pendLength > 0) && (false === force)) {
		throw new Error("Submit pending changes before clearing database or call clearAll(true) to force.");
	} else {
		this.dbService.clearAll();
		this.pendingService.pendingDelete();
	}
};

RestOff.prototype.clear = function(repoName, force) {
	force = undefined === force ? false : force;
	var pendLength = this.pendingService.pendingCount(repoName);
	if ((pendLength > 0) && (false === force)) {
		throw new Error("Submit pending changes before clearing database or call clear(repoName, true) to force.");
	} else {
		this.dbService.clear(repoName);
		this.pendingService.pendingClear(repoName);
	}
};

RestOff.prototype._queryAddPk = function(uri, query) {
	if ("" !== uri.primaryKey) {
		query[this._pkNameGet(uri)] = uri.primaryKey;
	}
	return query;
};

RestOff.prototype._queryBuildFromUri = function(uri) {
	return this._queryAddPk(uri, uri.searchOptions);
};

// The original uri may have a query string that should be ignored when running
// The sync logic (in _repoAddResource). We want to get the raw, non-query,
// result from the repo instead.
RestOff.prototype._repoGetRaw = function(uri) {
	return uri.options.persistenceDisabled ? [] :
		this.dbService.findSync(uri.repoName);
};

RestOff.prototype._repogetRepo = function(uri) {
	// TODO: Write tests for persistenceDisabled and the usage of queryBuildFromUri call below
	return uri.options.persistenceDisabled ? [] :
		this.dbService.findSync(uri.repoName, this._queryBuildFromUri(uri));
};

RestOff.prototype._repoFindSync = function(uri) {
	return this.dbService.findSync(uri.repoName, this._queryAddPk(uri, {}));
};

RestOff.prototype._repoFind = function(uri) {
	var that = this;
	return new Promise(function(resolve) {
		resolve(that._repoFindSync(uri));
	});
};

RestOff.prototype._repoAdd = function(uri, resourceRaw) {
	var that = this;
	return new Promise(function(resolve, reject) {
		if (!uri.resources && resourceRaw){
			  uri.resources = JSON.parse(resourceRaw); // TODO: Check for non-json result and throw error/convert/support images/etc.
			  if (that.resourceFilter) uri.resources=that.resourceFilter(uri.resources,uri); //Clean the resources
		}
		return that._repoAddResource(uri).then(function(result) {
			resolve(result);
		}).catch(function(error) { // TODO: Test
			reject(error);
		});
	});
};

RestOff.prototype._hashify = function(pKeyName, resources) {
	var repositoryHash = {};
	resources.forEach(function(resource) {
		if (undefined !== resource) {
			var repositoryPrimaryKey = resource[pKeyName];
			repositoryHash[repositoryPrimaryKey] = resource;
		}
	});
	return repositoryHash;
};

RestOff.prototype._joinedHash = function(pKeyName, serverResources, clientResources) {
	var hash = {};

	serverResources.forEach(function(resource) {
		var primaryKey = resource[pKeyName];
		var hashEntry = {};
		hashEntry.server = resource;
		hash[primaryKey] = hashEntry;
	});

	clientResources.forEach(function(resource) {
		var primaryKey = resource[pKeyName];
		if (undefined !== hash[primaryKey]) {
			hash[primaryKey].client = resource;
		} else {
			var hashEntry = {};
			hashEntry.client = resource;
			hash[primaryKey] = hashEntry;
		}
	});

	return hash;
};

RestOff.prototype._applyAndClearPending = function(pendingAction, uri) {
	var that = this;
	return new Promise(function(resolve, reject) {
		if (that._options.onCallPending) {
			that._options.onCallPending(pendingAction, uri);
		}
		// NOTE: We want to use the original uri when we "resbumit" the call to the
		//       server now that we are online. So, we pass true for useOriginalUri
		//       so we don't re-generate it (which would also cause any
		//       autoQueryParams to get appended twice.
		return that._restCall(pendingAction.uri, pendingAction.restMethod, 
					pendingAction.hasPK ? Object.assign({hasPK:true},uri.options) :	uri.options, 
					pendingAction.resources, true).then(function() { // TODO: Write a test for this being true.
			if ("POST"===pendingAction.restMethod && uri.options.dbService && uri.options.dbService.primaryKeyNotOnPost) {
				  //We need to remove the old object when receive new keys on post
				  var pkSearch = {};
				  pkSearch[that._pkNameGet(uri)]=pendingAction.primaryKey;
		  		that.dbService.deleteRepo(pendingAction.repoName, pkSearch);
			}
			resolve(that.pendingService.pendingDelete(pendingAction.id));
		}).catch(function(error) {
			reject(error);
		});
	});
};


// Logic table when we go back online
//
// On Server In Repo  In Pending  Meaning                                              Action
// true      true     true        Client changes. Possible changes on server too. PUT/POST Only   | Reconcile. Clear out pending.
// true      true     false       No changes on client. Possible changes on server.               | Add to postUpdated
// true      false    true        Deleted on Client                                  | Complete delete on server. Clear out pending.
// true      false    false       Post/Put on server                                 | Add to postUpdated
// false     true     true        Post/Put on client                                 | Clear out pending. Complete post/put on client. Could have been deleted from server???
// false     true     false       Delete on server                                   | Remove from repoClient directly
// false     false    true        Added then Deleted on Client                       | Don't complete delete on server. Clear out pending.
// false     false    false       NOT POSSIBLE (Nothing Posted/Put/Deleted/Added)    | Do Nothing
RestOff.prototype._forEachHashEntry = function(uri, joinedHash, serverResources, repoResources, pendingHash, newUpdatedResources) {
	var that = this;

	return Object.keys(joinedHash).map(function(primaryKey) {
		return new Promise(function(resolve, reject) {
			var serverResource = joinedHash[primaryKey].server;
			var repoResource = joinedHash[primaryKey].client;
			var pendingAction = pendingHash[primaryKey];
			var onServer = (undefined !== serverResource);
			var inRepo = (undefined !== repoResource);
			var inPending = (undefined !== pendingHash[primaryKey]);
			// console.log(primaryKey + " Server %O Repo %O Pending %O", onServer, inRepo, inPending);
			// console.log("Server %O Repo %O Pending %O", serverResource, repoResource, pendingAction);
			if (onServer) {
				if (inRepo) {
					if (inPending) {  // True, True, True   : Client changes. Possible changes on server too. PUT/POST Only   | Reconcile. Clear out pending.
						var pendingOriginal = pendingAction ? pendingAction.original : undefined;
						if (that.resourceFilter) {
							pendingOriginal=that.resourceFilter(pendingOriginal,uri); //Clean the resources
							serverResource=that.resourceFilter(serverResource,uri); //Clean the resources
						}
						var serverSideEdit = ('overwrite' === that.options.concurrency) ? false : !deepEquals(serverResource, pendingOriginal);
						if (serverSideEdit) { // edited on server and client: BRENT reconciliation
							// First: Let's fix the original record
							var newId = that.options.generateId();
							pendingAction.primaryKeyOriginal = pendingAction.primaryKey;
							pendingAction.primaryKey = newId;
							pendingAction.resources[that._pkNameGet(uri)] = newId;
							//TODO CHECK WHY he indicates server has been updated
							if ("PUT" === pendingAction.restMethod) { // will need to convert a PUT to a POST but can keep the existing post the same
								pendingAction.restMethod = "POST";
								//When on backenless also remove the ojectkey
								pendingAction.uri = pendingAction.uri.replace("/"+pendingAction.primaryKeyOriginal, "");
								pendingAction.hasPK =false;
							}

							// Second: Let's apply the new change on the server
							return that._applyAndClearPending(pendingAction, uri).then(function() {
								// Thrid: We will need to add this "new record" to the existing repository, disabled is allready added by post
					      //newUpdatedResources.push(pendingAction.resources);
								// Fourth: but we keep the original record in the repo becuase it will be overwritten by the resolve
								newUpdatedResources.push(serverResource);
								// Finally: Notify someone that Brent Reconciliation just happened
								if (that.options.onReconciliation) {
									that.options.onReconciliation(pendingAction);
								}
								resolve();
							}).catch(function(error) { // TODO: Test
								reject(error);
							});
							//
						} else { // edited on client and already in repo so no need to add to newUpdatedResources. Clean out Pending.
							return that._applyAndClearPending(pendingAction, uri).then(function() {
								resolve();
							}).catch(function(error) { // TODO: Test
								reject(error);
							});
						}
					} else {          // True, True, False  : No changes on client. Possible changes on server.  | Add to newUpdatedResources
						resolve(newUpdatedResources.push(serverResource));
					}
				} else {
					if (inPending) {  // True, False, True  : Deleted on Client                                  | Complete delete on server. Clear out pending.
						// TODO: Log that this was done and/or have a callback because a pending client post/put was ignored becuase it was deleted on the server
						return that._applyAndClearPending(pendingAction, uri).then(function() {
							resolve();
						}).catch(function(error) { // TODO: Test
							reject(error);
						});
					} else {          // True, False, False : Post/Put on server                                 | Add to postUpdated
						resolve(newUpdatedResources.push(serverResource));
					}
				}
			} else {
				if (inRepo) {
					if (inPending) {  // False, True, True  : Post/Put on client                                 | Clear out pending. Complete post/put on client
						if (undefined === pendingAction.original) { // not on server no origional, so must have been created on client.
							return that._applyAndClearPending(pendingAction, uri).then(function(){
								resolve();
							}).catch(function(error) { // TODO: Test
								reject(error);
							});
						} else { // not on server, but had an original so must have been on server at one time. So, a delete.
							that.dbService.deleteRepo(uri.repoName, that._queryAddPk(uri, {}));
							resolve(that.pendingService.pendingDelete(pendingAction.id));
						}
					} else {          // False, True, False : Delete on server                                   | Remove from repoClient directly
						resolve(that.dbService.deleteRepo(uri.repoName, that._queryAddPk(uri, {})));
					}
				} // else {  // Can't get to this case. We loop through the joined hash. A resource that is added and
				             // then deleted while offline will not be in the joined hash BUT the pending will still be there.
				  //	if (inPending) {  // False, False, True : Added then Deleted on Client                       | Don't complete delete on server. Clear out pending.
						// Have this case in test "73: A3, B3, C3" record emailEUpdated but never gets here.
				  //		console.log(primaryKey + " False, False, True: 07 Requires implementation. Please contact developer for use case.");
				  //	} // else False, False, False: Do Nothing becuase no Posted/Put/Deleted
				// }
			}
			resolve("Error: Should not be here. It means the code is not complete.");
		});
	});
};

RestOff.prototype._repoAddResourceSync = function(uri) {
	if (!uri.options.persistenceDisabled) {
		var resourceArray = (uri.resources instanceof Array) ? uri.resources : [uri.resources]; // make logic easier
		this.dbService.writeSync(uri.repoName, resourceArray, uri.options);
		return resourceArray;
	} // else don't persist
	return  uri.resources;
};

// NOTE: Will alter the order of the records returned. So, if a sort
// order was applied it will probably not be valid after the merge.
// NOTE: A lot of this logic is to try and lower the number of promises
// NOTE: Logic is for databases without soft deletes or last_updated fields
//       So, the overhead is a lot higher. We can greatly reduce the overhead
//       against databases that have soft deletes and last updated dates
RestOff.prototype._repoAddResource = function(uri) {
	var that = this;
	return new Promise(function(resolve, reject) {
		if (!uri.options.persistenceDisabled) {
			if ("GET" === uri.restMethod) {  // Complete get, doing a merge because we don't have soft_delete
				var serverResources = (uri.resources instanceof Array) ? uri.resources : [uri.resources]; // makes logic easier
				
				var pending = that.pendingService.pendingGet(uri.repoName);
				if (pending.length > 0 ) { // we got reconciliation work to do!!!
					var repoResources = that._repoGetRaw(uri);
					var newUpdatedResources = [];
					var pkName = that._pkNameGet(uri);
					var joinedHash = that._joinedHash(pkName, serverResources, repoResources);
					var pendingHash = that._hashify("primaryKey", pending);

					var actions = that._forEachHashEntry(uri, joinedHash, serverResources, repoResources, pendingHash, newUpdatedResources);
					return Promise.all(actions).then(function() {
						that.dbService.writeSync(uri.repoName, newUpdatedResources, uri.options);
						that.pendingService.pendingClear(uri.repoName); // that.delete removes any dangling pending changes like a post and then delete of the same resource while offline.
						var repoResources = that._repoGetRaw(uri);
						resolve(repoResources);
					}).catch(function(error) {
						reject(error);
					});
				} else {
					that.clear(uri.repoName);
					that.dbService.writeSync(uri.repoName, serverResources, uri.options);
					resolve(serverResources);
				}
			} else {
				var resourceArray = (uri.resources instanceof Array) ? uri.resources : [uri.resources]; // make logic easier
				that.dbService.writeSync(uri.repoName, resourceArray, uri.options);
				resolve(resourceArray);
			}
		} // else don't persist
		else {
			resolve(uri.resources);
		}
	});
};

RestOff.prototype._repoDeleteResourceSync = function(uri) {
	if (!uri.options.persistenceDisabled) {
		this.dbService.deleteRepo(uri.repoName, this._queryAddPk(uri, uri.searchOptions));
	}
	return uri.primaryKey;
};

RestOff.prototype._createError = function(uri, customMessage) {
	var request = uri.request;
	var messageDetail = request.responseText.replace(/\r?\n|\r/g, "");
	var message = customMessage ? customMessage : request.statusText;

	if (0 === request.status) {
		message = "Network Error";
	}

	var msg = {
		message: message,
		messageDetail: messageDetail,
		response:request.response || request.responseText,
		status: request.status,
		uri: uri.uriFinal,
		restMethod: uri.restMethod
	};
	if (uri.options.errorHandler) uri.options.errorHandler(msg);
	return msg;
};

RestOff.prototype.autoQueryParamSet = function(name, value) {
	if (value) this._autoParams[name] = value;
	else delete this._autoParams[name];
	return this;
};

RestOff.prototype.autoQueryParamGet = function(name) {
	return this._autoParams[name];
};

RestOff.prototype.autoHeaderParamSet = function(name, value) {
	if (value)  this._autoHeaders[name] = value;
	else delete  this._autoHeaders[name];
	return this;
};

RestOff.prototype.autoHeaderParamGet = function(name) {
	return this._autoHeaders[name];
};

RestOff.prototype._requestHeaderSet = function(request) {
	var autoHeaders = this._autoHeaders;
	Object.keys(autoHeaders).forEach(
		function(key) {
			request.setRequestHeader(key, autoHeaders[key]); // TODO: Write a test to cover this
		}
	);
};

RestOff.prototype._uriAddRequest = function(uri, request) {
	if (uri.request) { //We allready have a uri request, we will join it
		uri.request.readyState =request.readyStateRestOff;
		if (request.status!=200) uri.request.status=request.status;
		uri.request.readyState=uri.request.readyState;
		uri.request.statusText=uri.request.statusText ? uri.request.statusText + request.statusText : request.statusText;
		//Join response data
		var resp1 = JSON.parse(request.response || request.responseText);
		if (this.resourceFilter) {
			var resp2 = this.resourceFilter(resp1,uri);
			for (var i=0;i<resp2.length;i++) uri.resources.push(resp2[i]);
		}
		if (this.pageHandler)  uri.nextUri = this.pageHandler(resp1,uri);
		else delete uri.nextUri;
		delete uri.request.response; //Should not be used we have allready parse the resources
		delete uri.request.responseText; //Should not be used we have allready parse the resources
	} else {
		uri.request = {
			readyState : request.readyStateRestOff,
			status : request.status,
			statusText : request.statusText,
			response: request.response,
			responseText: request.responseText
		}
		if (uri.request.response || uri.request.responseText) {
			var resp1= JSON.parse(uri.request.response || uri.request.responseText);
			if (this.resourceFilter) uri.resources=this.resourceFilter(resp1,uri);
			if (!(uri.resources instanceof Array))  uri.resources = [uri.resources];
			if (this.pageHandler)  uri.nextUri = this.pageHandler(resp1,uri);
		}
	}
	return uri;
};

RestOff.prototype._dbdeleteRepo = function(uri) {
	if (!uri.options.clientOnly) {
		this.pendingService.pendingAdd(uri);
	}
	return this._repoDeleteResourceSync(uri);
};

RestOff.prototype._dbDelete = function(uri, resolve, reject) {
	var request = uri.request;
	switch (request.status) {
		case 200: case 202: case 204: // TODO: Write test for 202 and 204
			resolve(this._repoDeleteResourceSync(uri));
		break;
		case 404:
			resolve(this._repoDeleteResourceSync(uri)); // 404 but will remove from client anyway
		break;
		case 0:
			var clientOnly = uri.options.clientOnly;
			if (uri.options.forcedOffline || clientOnly) {
				if (!clientOnly) { // TODO: Provide a call back if !clientOnly and !forcedOffline when we get here.
					this.pendingService.pendingAdd(uri);
					resolve(this._repoDeleteResourceSync(uri));
				} else {
					resolve(this._repoDeleteResourceSync(uri));
				}
			} else {
				reject(this._createError(uri));
			}
		break;
		case 401: // Unauthorized TODO: Test
			reject(this._createError(uri));
		break;
		default:
			reject(this._createError(uri, "Delete Unsupported HTTP response " + request.status)); // TODO: Tests
	}
};

RestOff.prototype._dbGet = function(uri) {
	var that = this;
	return new Promise(function(resolve, reject) {
		var request = uri.request;
		switch (request.status) {
			case 200:
				return that._repoAdd(uri, request.response).then(function(result) {
					resolve(result);
				}).catch(function(error){ // TODO: Test
					reject(error);
				});
			case 0: case 404:
				var clientOnly = uri.options.clientOnly;
				if (uri.options.forcedOffline || clientOnly) {
					 // TODO: Provide a call back if !clientOnly and !forcedOffline when we get here.
					var result = that._repogetRepo(uri);
					resolve(result);
				} else {
					reject(that._createError(uri));
				}
			break;
			case 401: // Unauthorized TODO: Test
				reject(this._createError(uri));
			break;
			default:
				reject(this._createError(uri, "Get Unsupported HTTP response " + request.status)); // TODO: Tests
		}
	});
};

RestOff.prototype._dbPost = function(uri, resolve, reject) {
	var request = uri.request;
	switch (request.status) {
		case 200: case 201: // TODO: Test for case 200
			return this._repoAdd(uri,request.response).then(function(result) {  // TODO: IMPORTANT!!! Use request.response: need to add backend service to test this
				resolve(result);
			}).catch(function(error){
				reject(error);
			});
		case 0: case 404:
			var clientOnly = uri.options.clientOnly;
			if (uri.options.forcedOffline || clientOnly) {
				 // TODO: Provide a call back if !clientOnly and !forcedOffline when we get here.
				this._pendingRepoAdd(uri, clientOnly, resolve, reject);
			} else {
				reject(this._createError(uri));
			}
		break;
		case 401: // Unauthorized TODO: Test
			reject(this._createError(uri));
		break;
		default:
			reject(this._createError(uri, "Post Unsupported HTTP response " + request.status)); // TODO: Tests
	}
};

RestOff.prototype._dbputRepo = function(uri) {
	var found = this._repoFindSync(uri);
	if (found && (0 !== found.length)) { // offline but found resource on client so add it
		return this._pendingRepoAddSync(uri);
	} else {
		throw new Error({
			"message" : "Not Found",
			"messageDetail" : "Not Found",
			"status": 404,
			"uri": uri.uriFinal
		});
	}
};

RestOff.prototype._dbPut = function(uri, resolve, reject) {
	var request = uri.request;
	switch (request.status) {
		case 200:
			return this._repoAdd(uri,request.response).then(function(result) {  // TODO: IMPORTANT!!! Use request.response: need to add backend service to test this
				resolve(result);
			}).catch(function(error){
				reject(error);
			});
		case 0: case 404:
			var clientOnly = uri.options.clientOnly;
			if (uri.options.forcedOffline || clientOnly) { // we are offline, but resource not found so 404 it.
				 // TODO: Provide a call back if !clientOnly and !forcedOffline when we get here.
				var that = this;
				return this._repoFind(uri).then(function(found) {
					if (found) { // offline but found resource on client so add it
						return that._pendingRepoAdd(uri, clientOnly, resolve, reject);
					} else {
						uri.request.status = 404;
						uri.request.statusText = "Not Found";
						reject(that._createError(uri));
					}
				});
			} else {
				reject(this._createError(uri));
			}
		break;
		case 401: // Unauthorized TODO: Test
			reject(this._createError(uri));
		break;
		default:
			reject(this._createError(uri, "Put Unsupported HTTP response " + request.status)); // TODO: Tests
	}
};

RestOff.prototype._restCall = function(uriClient, restMethod, options, resource, useOriginalUri) {
	var that = this;
	var restRequest = function _resetRequest(uri,resource) {
		return new Promise(function(resolve, reject) {
				var request = that._requestGet(uri);
				var cResource = Object.assign({},resource)	
				if (that.resourceFilter) cResource=that.resourceFilter(cResource,uri); 
				//A lot of systems do not like the primarykey being send during post
				if (("POST" === uri.restMethod) && uri.options.dbService && uri.options.dbService.primaryKeyNotOnPost) {
					delete cResource[uri.primaryKeyName];
				}
			  if (("PUT" === uri.restMethod)
					&& uri.options.dbService && uri.options.dbService.updatedFieldName){
					cResource[uri.options.dbService.updatedFieldName]=
						  uri.options.dbService.updatedValue ? uri.options.dbService.updatedValue() : new Date().getTime();
				}
				var	body = JSON.stringify(cResource || {});
				request.open(uri.restMethod, uri.uriFinal, true); // true: asynchronous
				that._requestHeaderSet(request);
				request.onreadystatechange = function() {
					if(4 === request.readyStateRestOff) { // Done = 4
						that._uriAddRequest(uri, request);
						if (uri.nextUri) {
								uri.uriFinal=uri.nextUri;
								restRequest(uri,resource).then(resolve,reject).catch(function(error) { 
														reject(error);
													 });
						} else resolve(); //Finished Request resolve it
					} // else ignore other readyStates
				};
				if (("POST" === uri.restMethod) || ("PUT" === uri.restMethod) || ("DELETE" === uri.restMethod)) {
					request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
					request.send(body);
				} else {
					request.send();
				}
			});
	}

	return new Promise(function(resolve, reject) {
		var uri = that.uriFromClient(uriClient, restMethod, resource, options, useOriginalUri);
		restRequest(uri,resource).then(function (request){
				switch(uri.restMethod) {
					case "GET":
						return that._dbGet(uri).then(function(result) {
							resolve(result);
						}).catch(function(error) {
							reject(error);
						});
					case "POST":
						that._dbPost(uri, resolve, reject);
					break;
					case "PUT":
						that._dbPut(uri, resolve, reject);
					break;
					case "DELETE":
						that._dbDelete(uri, resolve, reject);
					break;
						
					 default: reject(); //Should not happen 
				}
		}).catch(function(error) { // TODO: Test
			reject(error);
		});
	});
};

RestOff.prototype.restCallSync = function(uriClient, restMethod, options, resource, useOriginalUri) {
	var uri = this.uriFromClient(uriClient, restMethod, resource, options, useOriginalUri);
	switch(uri.restMethod) {
		case "GET":
			return this._repogetRepo(uri);
		case "POST":
			return this._pendingRepoAddSync(uri);
		case "PUT":
			return this._dbputRepo(uri);
		case "DELETE":
			return this._dbdeleteRepo(uri);
		default:
			throw new Error("Rest method '" + restMethod + "' not currently supported or is invalid.");
	}
};

RestOff.prototype.deleteRepo = function(uri, options) {
	return this.restCallSync(uri, "DELETE", options, undefined, false);
};

RestOff.prototype.getRepo = function(uri, options) {
	return this.restCallSync(uri, "GET", options, undefined, false);
};

RestOff.prototype.postRepo = function(uri, resource, options) {
	return this.restCallSync(uri, "POST", options, resource, false);
};

RestOff.prototype.putRepo = function(uri, resource, options) {
	return this.restCallSync(uri, "PUT", options, resource, false);
};

RestOff.prototype.delete = function(uri, options) {
	return this._restCall(uri, "DELETE", options, undefined, false);
};

RestOff.prototype.get = function(uri, options) {
	return this._restCall(uri, "GET", options, undefined, false);
};

RestOff.prototype.post = function(uri, resource, options) {
	return this._restCall(uri, "POST", options, resource, false);
};

RestOff.prototype.put = function(uri, resource, options) {
	return this._restCall(uri, "PUT", options, resource, false);
};

RestOff.prototype.deleteOne = function(uri, resource, options) {
	return this._restCall(uri + '/' + (typeof resource == "string" ?  resource : resource[this._options.dbService.primaryKeyName]), "DELETE", Object.assign(options||{},{hasPK:true}), undefined, false);
};

RestOff.prototype.getOne = function(uri,resource,options){
	return this._restCall(uri + '/' + (typeof resource == "string" ?  resource : resource[this._options.dbService.primaryKeyName]), "GET", Object.assign(options||{},{hasPK:true}), undefined, false);
};

RestOff.prototype.postOne = function(uri, resource, options) {
	return this._restCall(uri + '/' + resource[this._options.dbService.primaryKeyName], "POST", Object.assign(options||{},{hasPK:true}), resource, false);
};

RestOff.prototype.putOne = function(uri, resource, options) {
	return this._restCall(uri + '/' + resource[this._options.dbService.primaryKeyName], "PUT", Object.assign(options||{},{hasPK:true}), resource, false);
};

RestOff.prototype.clone = function(config){
	if (!config) config={};
	for (var key in this._options) {
		if (!(config.hasOwnProperty(key))) config[key]=this._options[key];
	}
	var obj = new restoff(config);
	for (var key in this._autoParams) obj.autoQueryParamSet(key,this._autoParams[key]);	
	for (var key in this._autoHeaders) obj.autoHeaderParamSet(key,this._autoHeaders[key]);	
	return obj;
};

RestOff.prototype.read = function(repoName,query,makeCopy) {
	if (makeCopy!==false) return JSON.parse(JSON.stringify(this.dbService.dbRepo.read(repoName,query)));
	return this.dbService.dbRepo.read(repoName,query);
};

RestOff.prototype.sync = function(repoName,config){
	if (!config) config={};
	return new Promise(function (resolve,reject){
		//We cannot sync if we are offline
		if (this.forcedOffline) {
       resolve();
		} else {
			 //Check if we have pending items for this repo
			 //Check if we should download delta or full
			
			 //Now we should run the normal command
		}
	}).catch(function(error) { // TODO: Test
			reject(error);
	});
};



restlib.restoff = restoff;

if (typeof angular !== "undefined") {
    angular.module("restoff", [])
        .provider("restoff", [function() {
            var config = null;

            this.setConfig = function(newConfig) {
                config = newConfig;
            };

            this.$get = [function() {
                return new restoff(config);
            }];
        }]);
} // else we aren't using angular
// TODO: When restoff-angular becomes it's own NPM module
// TODO: This should throw an exception and/or notify the user that
// TODO: they need to include angular.js / angular.min.js


}.call(this));