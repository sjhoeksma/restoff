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
	that._autoParams = {};
	that._autoHeaders = {};
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
		uri.resources = JSON.parse(resourceRaw); // TODO: Check for non-json result and throw error/convert/support images/etc.
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
		return that._restCall(pendingAction.uri, pendingAction.restMethod, uri.options, pendingAction.resources, true).then(function() { // TODO: Write a test for this being true.
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
						var serverSideEdit = ('overwrite' === that.options.concurrency) ? false : !deepEquals(serverResource, pendingOriginal);
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
							return that._applyAndClearPending(pendingAction, uri).then(function() {

								// Thrid: We will need to add this "new record" to the existing repository
								newUpdatedResources.push(pendingAction.resources);
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
		return uri.options.returnResponse ? (uri.request.response || uri.request.responseText) : uri.resources;
	} // else don't persist
	return uri.options.returnResponse!==false ? (uri.request.response || uri.request.responseText) : uri.resources;
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
						resolve(uri.options.returnResponse ? (uri.response || uri.responseText) : repoResources);
					}).catch(function(error) {
						reject(error);
					});
				} else {
					that.clear(uri.repoName);
					that.dbService.writeSync(uri.repoName, serverResources, uri.options);
					resolve(uri.options.returnResponse ? (uri.request.response || uri.request.responseText) : serverResources);
				}
			} else {
				var resourceArray = (uri.resources instanceof Array) ? uri.resources : [uri.resources]; // make logic easier
				that.dbService.writeSync(uri.repoName, resourceArray, uri.options);
				resolve(uri.options.returnResponse ? (uri.request.response || uri.request.responseText) : repoResources);
			}
		} // else don't persist
		else resolve(uri.options.returnResponse!==false ? (uri.request.response || uri.request.responseText) : repoResources);
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

	return {
		message: message,
		messageDetail: messageDetail,
		status: request.status,
		uri: uri.uriFinal,
		restMethod: uri.restMethod
	};
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
	uri.request = {
		readyState : request.readyStateRestOff,
		status : request.status,
		statusText : request.statusText,
		response: request.response,
		responseText: request.responseText
	};
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
			reject(that._createError(uri, "Delete Unsupported HTTP response " + request.status)); // TODO: Tests
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
				reject(that._createError(uri, "Get Unsupported HTTP response " + request.status)); // TODO: Tests
		}
	});
};

RestOff.prototype._dbPost = function(uri, resolve, reject) {
	var request = uri.request;
	switch (request.status) {
		case 200: case 201: // TODO: Test for case 200
			return this._repoAddResource(uri).then(function(result) {  // TODO: IMPORTANT!!! Use request.response: need to add backend service to test this
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
			return this._repoAddResource(uri).then(function(result) {  // TODO: IMPORTANT!!! Use request.response: need to add backend service to test this
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
	return new Promise(function(resolve, reject) {
		var uri = that.uriFromClient(uriClient, restMethod, resource, options, useOriginalUri);
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
	return this._restCall(uri + '/' + resource[this._options.dbService.primaryKeyName], "DELETE", options, undefined, false);
};

RestOff.prototype.getOne = function(uri,resource,options){
	return this._restCall(uri + '/' + resource[this._options.dbService.primaryKeyName], "GET", options, undefined, false);
}

RestOff.prototype.postOne = function(uri, resource, options) {
	return this._restCall(uri + '/' + resource[this._options.dbService.primaryKeyName], "POST", options, resource, false);
};

RestOff.prototype.putOne = function(uri, resource, options) {
	return this._restCall(uri + '/' + resource[this._options.dbService.primaryKeyName], "PUT", options, resource, false);
};


restlib.restoff = restoff;
