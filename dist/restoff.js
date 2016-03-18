// restoff.js
// version: 0.2.4
// author: ProductOps <restoff@productops.com>
// license: MIT
(function() {
"use strict";

var root = this; // window (browser) or exports (server)
var restlib = root.restlib || {}; // merge with previous or new module
restlib["version-library"] = '0.2.4'; // version set through gulp build

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

	if (typeof module !== 'undefined' && module.exports) {
		low = require('lowdb');
		var storage = require('lowdb/file-sync');
		that._low = low(that.dbName, { storage: storage }); // file storage
	} else {
		if (typeof low !== 'undefined') {
			that._low = low(that.dbName, { storage: low.localStorage }); // local storage
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

function restoffService(config) {
	var defaultConfig = {
		primaryKeyName: "id",
		dbName: "restoff.json",
		repoOptions: []
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
	options: { get: function() { return this._options; }},
	primaryKeyName: {
		get: function() { return this.options.primaryKeyName; },
		set: function(value) { this.options.primaryKeyName = value; }
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
	var result = undefined;
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


RestOffService.prototype.clearNp = function(repoName) {
	return this.dbRepo.clear(repoName);
};

RestOffService.prototype.clearAllNp = function() {
	return this.dbRepo.clearAll();
};

RestOffService.prototype.deleteNp = function(repoName, query) {
	return this.dbRepo.delete(repoName, query);
};

RestOffService.prototype.findNp = function(repoName, query) {
	return this.dbRepo.read(repoName, query);
};

RestOffService.prototype.writeNp = function(repoName, resources, options) {
	var pkName = this.pkNameGet(repoName, options);
	resources = (resources instanceof Array) ? resources : [resources]; // make logic easier
	resources.forEach(function(resource) {
		var primaryKey = resource[pkName];
		if (undefined === primaryKey) {
			// TODO: IMPORTANT FIX Need to do something better than throw an exception
			throw new Exception("Primary key '" + pkName + "' missing for resource or the resource has an invalid primary key.");
		}
	});

	var that = this;
	resources.forEach(function(resource) {
		that.dbRepo.write(repoName, pkName, resource);
	});
	return resources;
};

restlib.restoffService = restoffService;

function restoff(config) {
	var defaultConfig = {
		rootUri: "",
		clientOnly: false,
		forcedOffline: false,
		persistenceDisabled: false,
		pendingUri: "http://localhost/",
		pendingRepoName: "pending"
	};

	var that = Object.create(RestOff.prototype);
	that._options = Object.assign(defaultConfig, config);
	that._options.generateId = (config && config.generateId) ? config.generateId : that._guidGenerate;
	that._isOnline = null;
	that._autoParams = {};
	that._autoHeaders = {};
	that._dbService = restoffService(that._options.dbService);
	return that;
}

function RestOff() {}
RestOff.prototype = Object.create(Object.prototype, {
	dbService: { get: function() { return this._dbService; }},
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
	persistenceDisabled: {
		get: function() { return this._options.persistenceDisabled; },
		set: function(value) { this._options.persistenceDisabled = value; }
	},
	rootUri: {
		get: function() { return this._options.rootUri; },
		set: function(value) { this._options.rootUri = value; }
	},
	options: {
		get: function() { return this._options; }
	}
});

RestOff.prototype._pkNameGet = function(uri) {
	return this.dbService.pkNameGet(uri.repoName, uri.options);
};

RestOff.prototype._logMessage = function(message) {
	console.log(message);
};

RestOff.prototype._pendingRecordsNp = function(repoName) {
	var pendingUri = this.pendingRepoName + (repoName ? "?repoName=" + repoName : "");
	return this.getNp(pendingUri, {rootUri:this.pendingUri,clientOnly:true}); // Eat our own dog food
};

RestOff.prototype._pendingPostNp = function(resource) {
	return this.postNp(this.pendingUri + this.pendingRepoName, resource, {rootUri:this.pendingUri,clientOnly:true})
};


RestOff.prototype._pendingLengthNp = function(repoName) {
	var pending = this._pendingRecordsNp(repoName);
	return pending ? pending.length : 0;
};

RestOff.prototype._pendingDeleteNp = function(itemId) {
	var uri = this.pendingRepoName + (itemId ? "/"+itemId : "");
	return this.deleteNp(uri, {rootUri:this.pendingUri, clientOnly:true});
};

RestOff.prototype._pendingClearNp = function(repoName) {
	var uri = this.pendingRepoName + "?repoName=" + repoName;
	return this.deleteNp(uri, {rootUri:this.pendingUri, clientOnly:true});
};

RestOff.prototype._pendingAddNp = function(uri) {
	var result = {
		"id" : this._guidGenerate(),
		"restMethod" : uri.restMethod,
		"resources" : uri.resources,
		"clientTime" : new Date(),
		"uri" : uri.uriFinal,
		"repoName" : uri.repoName,
		"primaryKey" : uri.primaryKey
	};

	if (!uri.options.persistenceDisabled) { // TODO: Write a test for this
		var original = this.dbService.findNp(uri.repoName, this._queryAddPk(uri, {}));
		if (undefined !== original[0]) {
			result.original = JSON.parse(JSON.stringify(original[0])); // need to clone original record
		}
		return this._pendingPostNp(result);
	} else {
		return result;
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
};

RestOff.prototype.uriFromClient = function(uri, restMethod, resources, options) {
	var uriResult = {
		uri: uri,
		primaryKey : "",
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
		uriResult.search = search[1];
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

	var pkName = this._pkNameGet(uriResult);
	if (undefined !== resources) {
		if ("id" !== pkName && "guid" !== pkName) { // lowdb requires keyname of id. Can't find documentation that let's us set it. Will do more research later
			if (resources instanceof Array) {
				resources.forEach(function (item) {
					item.id = item[pkName];
				});
			} else {
				resources.id = resources[pkName];
			}
		}
	}

	// TODO: Check if resource's primary key != uri primary key and warn (some cases when this could happen)
	if (("" === uriResult.primaryKey) && (undefined !== resources) && (null !== resources) && (undefined !== resources[pkName])) {
		uriResult.primaryKey = resources[pkName];
	}

	if (options && options.repoName) {
		uriResult.repoName = options.repoName;
	} else {
		uriResult.repoName = result;
	}

	if (("http:" === uriResult.repoName) || ("" === uriResult.repoName)) {
		// Note: We really can't figure out the rootUri from the uri provided when no rootUri was
		//       configured. This is because the rootUri could contain anything plus resource names
		// 	     and we don't know where the anything part stops and the resources start. So, we get
		//       this warning.
		this._logMessage("WARNING: repoName invalid. Had a uri of '" + uri + "' and a rootUri of '" + uriResult.options.rootUri + "'' which may be incorrect?");
	}
	return uriResult;
};

RestOff.prototype.clearAllNp = function(force) {
	force = undefined === force ? false : force;
	var pendLength = this._pendingLengthNp();
	if ((pendLength > 0) && (false === force)) {
		throw new Exception("Submit pending changes before clearing database or call clearAll(true) to force.");
	} else {
		this.dbService.clearAllNp();
		this._pendingDeleteNp();
	}
};


RestOff.prototype.clearAll = function(force) {
	var that = this;

	return new Promise(function(resolve, reject) {
		force = undefined === force ? false : force;
		var pendLength = that._pendingLengthNp();
		if ((pendLength > 0) && (false === force)) {
			reject("Submit pending changes before clearing database or call clearAll(true) to force.");
		} else {
			that.dbService.clearAllNp();
			resolve(that._pendingDeleteNp());
		}
	});
};

RestOff.prototype.clearNp = function(repoName, force) {
	force = undefined === force ? false : force;
	var pendLength = this._pendingLengthNp(repoName);
	if ((pendLength > 0) && (false === force)) {
		throw new Exception("Submit pending changes before clearing database or call clear(repoName, true) to force.");
	} else {
		this.dbService.clearNp(repoName);
		this._pendingClearNp(repoName);
	}
};


// TODO: Update all tests to use cleraNp and delete this.
RestOff.prototype.clear = function(repoName, force) {
	var that = this;
	return new Promise(function(resolve, reject) {
		force = undefined === force ? false : force;
		var pendLength = that._pendingLengthNp(repoName);
		if ((pendLength > 0) && (false === force)) {
			reject("Submit pending changes before clearing database or call clear(repoName, true) to force.");
		} else {
			that.dbService.clearNp(repoName);
			resolve(that._pendingClearNp(repoName));
		}
	});
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

RestOff.prototype._repoGetNp = function(uri) {
	// TODO: Write tests for persistenceDisabled and the usage of queryBuildFromUri call below
	return uri.options.persistenceDisabled ? [] :
		this.dbService.findNp(uri.repoName, this._queryBuildFromUri(uri));
};

RestOff.prototype._repoGet = function(uri) {
	var that = this;
	return new Promise(function(resolve) {
		if (uri.options.persistenceDisabled) {
			resolve([]);
		} else {
			resolve(that.dbService.findNp(uri.repoName, that._queryBuildFromUri(uri)));
		}
	});

};

RestOff.prototype._repoFindNp = function(uri) {
	return this.dbService.findNp(uri.repoName, this._queryAddPk(uri, {}));
};

RestOff.prototype._repoFind = function(uri) {
	var that = this;
	return new Promise(function(resolve) {
		resolve(that._repoFindNp(uri));
	});
};

RestOff.prototype._repoAdd = function(uri, resourceRaw) {
	var that = this;
	return new Promise(function(resolve) {
		uri.resources = JSON.parse(resourceRaw); // TODO: Check for non-json result and throw error/convert/support images/etc.
		return that._repoAddResource(uri).then(function(result) {
			resolve(result);
		});
	});
};

RestOff.prototype._deepEquals = function(x, y) {
	if ((typeof x == "object" && x !== null) && (typeof y == "object" && y !== null)) {
		if (Object.keys(x).length != Object.keys(y).length) {
			return false;
		}

		for (var prop in x) {
			if (y.hasOwnProperty(prop)) {
				if (! this._deepEquals(x[prop], y[prop])) {
					return false;
				}
			}
			else {
				return false;
			}
		}
	return true;
	} else return x === y;
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

RestOff.prototype._applyAndClearPending = function(pendingAction) {
	var that = this;
	return new Promise(function(resolve, reject) {
		return that._restCall(pendingAction.uri, pendingAction.restMethod, undefined, pendingAction.resources).then(function() {
			resolve(that._pendingDeleteNp(pendingAction.id));
		}).catch(function(error) {
			console.log ("WARNING! 001 Error %O occured.", error);
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
						var serverSideEdit = !that._deepEquals(serverResource, pendingOriginal);
						if (serverSideEdit) { // edited on server and client: BRENT reconciliation
							// First: Let's fix the original record
							var newId = that.options.generateId();
							pendingAction.primaryKeyOriginal = pendingAction.primaryKey;
							pendingAction.primaryKey = newId;
							pendingAction.resources[that._pkNameGet(uri)] = newId;
							if ("PUT" === pendingAction.restMethod) { // will need to convert a PUT to a POST but can keep the existing post the same
								pendingAction.restMethod = "POST";
								pendingAction.uri = pendingAction.uri.replace(pendingAction.primaryKeyOriginal, "");
							}

							// Second: Let's apply the new change on the server
							return that._applyAndClearPending(pendingAction, resolve, reject).then(function() {

								// Thrid: We will need to add this "new record" to the existing repository
								newUpdatedResources.push(pendingAction.resources);
								// Fourth: but we keep the original record in the repo becuase it will be overwritten by the resolve
								newUpdatedResources.push(serverResource);

								// Finally: Notify someone that Brent Reconciliation just happened
								if (that.options.onReconciliation) {
									that.options.onReconciliation(pendingAction);
								}

								resolve();
							});

							//
						} else { // edited on client and already in repo so no need to add to newUpdatedResources. Clean out Pending.
							return that._applyAndClearPending(pendingAction, resolve, reject).then(function() {
								resolve();
							});
						}
					} else {          // True, True, False  : No changes on client. Possible changes on server.  | Add to newUpdatedResources
						resolve(newUpdatedResources.push(serverResource));
					}
				} else {
					if (inPending) {  // True, False, True  : Deleted on Client                                  | Complete delete on server. Clear out pending.
						// TODO: Log that this was done and/or have a callback because a pending client post/put was ignored becuase it was deleted on the server
						return that._applyAndClearPending(pendingAction, resolve, reject).then(function() {
							resolve();
						});
					} else {          // True, False, False : Post/Put on server                                 | Add to postUpdated
						resolve(newUpdatedResources.push(serverResource));
					}
				}
			} else {
				if (inRepo) {
					if (inPending) {  // False, True, True  : Post/Put on client                                 | Clear out pending. Complete post/put on client
						if (undefined === pendingAction.original) { // not on server no origional, so must have been created on client.
							return that._applyAndClearPending(pendingAction, resolve, reject).then(function(){
								resolve();
							});
						} else { // not on server, but had an original so must have been on server at one time. So, a delete.
							that.dbService.deleteNp(uri.repoName, that._queryAddPk(uri, {}));
							resolve(that._pendingDeleteNp(pendingAction.id));
						}
					} else {          // False, True, False : Delete on server                                   | Remove from repoClient directly
						resolve(that.dbService.deleteNp(uri.repoName, that._queryAddPk(uri, {})));
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

RestOff.prototype._repoAddResourceNp = function(uri) {
	if (!uri.options.persistenceDisabled) {
		var resourceArray = (uri.resources instanceof Array) ? uri.resources : [uri.resources]; // make logic easier
		this.dbService.writeNp(uri.repoName, resourceArray, uri.options);
		return uri.resources;
	} // else don't persist
	return uri.resources;
};

// NOTE: Will alter the order of the records returned. So, if a sort
// order was applied it will probably not be valid after the merge.
// NOTE: A lot of this logic is to try and lower the number of promises
// NOTE: Logic is for databases without soft deletes or last_updated fields
//       So, the overhead is a lot higher. We can greatly reduce the overhead
//       against databases that have soft deletes and last updated dates
RestOff.prototype._repoAddResource = function(uri) {
	var that = this;
	return new Promise(function(resolve) {
		if (!uri.options.persistenceDisabled) {
			if (("" === uri.primaryKey) && ("GET" === uri.restMethod)) {  // Complete get, doing a merge because we don't have soft_delete
				var serverResources = (uri.resources instanceof Array) ? uri.resources : [uri.resources]; // makes logic easier
				var pending = that._pendingRecordsNp(uri.repoName);
				if (pending.length > 0 ) { // we got reconciliation work to do!!!
					return that._repoGet(uri).then(function(repoResources) {
						var newUpdatedResources = [];
						var pkName = that._pkNameGet(uri);
						var joinedHash = that._joinedHash(pkName, serverResources, repoResources);
						var pendingHash = that._hashify("primaryKey", pending);

						var actions = that._forEachHashEntry(uri, joinedHash, serverResources, repoResources, pendingHash, newUpdatedResources);
						return Promise.all(actions).then(function() {
							that.dbService.writeNp(uri.repoName, newUpdatedResources);
							that._pendingClearNp(uri.repoName); // that.delete removes any dangling pending changes like a post and then delete of the same resource while offline.
							return that._repoGet(uri).then(function(repoResources) {
								resolve(repoResources);
							});
						});
					});
				} else {
					that.clearNp(uri.repoName);
					that.dbService.writeNp(uri.repoName, serverResources);
					resolve(serverResources);
				}
			} else {
				var resourceArray = (uri.resources instanceof Array) ? uri.resources : [uri.resources]; // make logic easier
				that.dbService.writeNp(uri.repoName, resourceArray, uri.options);
				resolve(uri.resources);
			}
		} // else don't persist
		resolve(uri.resources);
	});
};

RestOff.prototype._repoDeleteResourceNp = function(uri) {
	if (!uri.options.persistenceDisabled) {
		this.dbService.deleteNp(uri.repoName, this._queryAddPk(uri, uri.searchOptions));
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

	return {
		"message" : message,
		"messageDetail" : messageDetail,
		"status": request.status,
		"uri": uri.uriFinal
	};
};

RestOff.prototype.autoQueryParamSet = function(name, value) {
	this._autoParams[name] = value;
	return this;
};

RestOff.prototype.autoQueryParamGet = function(name) {
	return this._autoParams[name];
};

RestOff.prototype.autoHeaderParamSet = function(name, value) {
	this._autoHeaders[name] = value;
	return this;
};

RestOff.prototype.autoHeaderParamGet = function(name) {
	return this._autoHeaders[name];
};

// TODO: Maybe use a library. See http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
RestOff.prototype._guidGenerate = function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
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
	uri.request = {
		readyState : request.readyStateRestOff,
		status : request.status,
		statusText : request.statusText,
		response: request.response,
		responseText: request.responseText
	};
	return uri;
};

RestOff.prototype._dbDeleteNp = function(uri) {
	if (!uri.options.clientOnly) {
		this._pendingAddNp(uri);
	}
	return this._repoDeleteResourceNp(uri);
};

RestOff.prototype._dbDelete = function(uri, resolve, reject) {
	var request = uri.request;
	switch (request.status) {
		case 200: case 202: case 204: // TODO: Write test for 202 and 204
			this._isOnline = true;
			resolve(this._repoDeleteResourceNp(uri));
		break;
		case 404:
			this._isOnline = true;
			resolve(this._repoDeleteResourceNp(uri)); // 404 but will remove from client anyway
		break;
		case 0:
			var clientOnly = uri.options.clientOnly;
			if (uri.options.forcedOffline || clientOnly) {
				if (!clientOnly) {
					this._isOnline = false;
					this._pendingAddNp(uri);
					resolve(this._repoDeleteResourceNp(uri));
				} else {
					resolve(this._repoDeleteResourceNp(uri));
				}
			} else {
				this._isOnline = null;
				reject(this._createError(uri));
			}
		break;
		default:
			console.log ("WARNING: Unsupported HTTP response " + request.status + " for uri '" + uri.uriFinal + "'.");
	}
};

RestOff.prototype._dbGet = function(uri) {
	var that = this;
	return new Promise(function(resolve, reject) {
		var request = uri.request;
		switch (request.status) {
			case 200:
				that._isOnline = true;
				return that._repoAdd(uri, request.response).then(function(result) {
					resolve(result);
				});
			case 0: case 404:
				var clientOnly = uri.options.clientOnly;
				if (uri.options.forcedOffline || clientOnly) {
					if (!clientOnly) {
						that._isOnline = false;
					}
					return that._repoGet(uri).then(function(result) {
						resolve(result);
					});
				} else {
					that._isOnline = 0 !== request.status ? true : null; // TODO: Write test for this line of code
					reject(that._createError(uri));
				}
			break;
			default:
				console.log ("WARNING: Unsupported HTTP response " + request.status + ".");
				reject();
		}
	});
};

RestOff.prototype._pendingRepoAddNp = function(uri) {
	if (!uri.options.clientOnly) { // TODO: Add test for this
		this._pendingAddNp(uri);
	}
	return this._repoAddResourceNp(uri);
};

RestOff.prototype._pendingRepoAdd = function(uri, clientOnly, resolve) {
	if (!clientOnly) {
		var that = this;
		this._pendingAddNp(uri);
		return that._repoAddResource(uri).then(function(result) {
			resolve(result);
		});
	} else {
		return this._repoAddResource(uri).then(function(result) {
			resolve(result);
		});
	}
};

RestOff.prototype._dbPost = function(uri, resolve, reject) {
	var request = uri.request;
	switch (request.status) {
		case 201:
			this._isOnline = true;
			return this._repoAddResource(uri).then(function(result) {  // TODO: IMPORTANT!!! Use request.response: need to add backend service to test this
				resolve(result);
			});
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
};

RestOff.prototype._dbPutNp = function(uri) {
	var found = this._repoFindNp(uri);
	if (found && (0 !== found.length)) { // offline but found resource on client so add it
		return this._pendingRepoAddNp(uri);
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
			this._isOnline = true;
			resolve(this._repoAddResource(uri)); // TODO: IMPORTANT!!! Use request.response: need to add backend service to test this
		break;
		default:
			this._isOnline = 0 !== request.status ? true : null;
			var clientOnly = uri.options.clientOnly;
			if (uri.options.forcedOffline || clientOnly) { // we are offline, but resource not found so 404 it.
				if (!clientOnly) { // TODO: Add test for this
					this._isOnline = false;
				}
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
				this._isOnline = 0 !== request.status ? true : null; // TODO: Write test for this line of code
				reject(this._createError(uri));
			}
	}
};

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
};

RestOff.prototype.restCallNp = function(uriClient, restMethod, options, resource) {
	var clientOnly = options ? !!options.clientOnly : false;
	if (!(this.forcedOffline || clientOnly)) {
		throw new Error(restMethod.toLowerCase() + "Np only available when forcedOffline or clientOnly is true.");
	} else {
		var uri = this.uriFromClient(uriClient, restMethod, resource, options);
		switch(uri.restMethod) {
			case "GET":
				return this._repoGetNp(uri);
			case "POST":
				return this._pendingRepoAddNp(uri)
			case "PUT":
				return this._dbPutNp(uri);
			case "DELETE":
				return this._dbDeleteNp(uri);
			default:
				throw new Error("Rest method '" + restMethod + "' not currently supported or is invalid.");
		}
	}
};

RestOff.prototype.deleteNp = function(uri, options) {
	return this.restCallNp(uri, "DELETE", options);
};

RestOff.prototype.getNp = function(uri, options) {
	return this.restCallNp(uri, "GET", options);
};

RestOff.prototype.postNp = function(uri, resource, options) {
	return this.restCallNp(uri, "POST", options, resource);
};

RestOff.prototype.putNp = function(uri, resource, options) {
	return this.restCallNp(uri, "PUT", options, resource);
};

RestOff.prototype.delete = function(uri, options) {
	return this._restCall(uri, "DELETE", options);
};

RestOff.prototype.get = function(uri, options) {
	return this._restCall(uri, "GET", options);
};

RestOff.prototype.post = function(uri, resource, options) {
	return this._restCall(uri, "POST", options, resource);
};

RestOff.prototype.put = function(uri, resource, options) {
	return this._restCall(uri, "PUT", options, resource);
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