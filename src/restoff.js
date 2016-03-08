function restoff(config) {
	var defaultConfig = {
		rootUri: "",
		clientOnly: false,
		forcedOffline: false,
		persistanceDisabled: false,
		pendingUri: "http://localhost/",
		pendingRepoName: "pending"
	};

	var that = Object.create(RestOff.prototype);
	that._options = Object.assign(defaultConfig, config);

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
	persistanceDisabled: {
		get: function() { return this._options.persistanceDisabled; },
		set: function(value) { this._options.persistanceDisabled = value; }
	},
	primaryKeyName: {
		get: function() { return this.dbService.primaryKeyName; },
		set: function(value) { this.dbService.primaryKeyName = value; }
	},
	rootUri: {
		get: function() { return this._options.rootUri; },
		set: function(value) { this._options.rootUri = value; }
	},
	options: {
		get: function() { return this._options; }
	}
});

RestOff.prototype._logMessage = function(message) {
	console.log(message);
}

RestOff.prototype._pendingRecords = function(repoName) {
	var pendingUri = this.pendingRepoName + (repoName ? "?repoName=" + repoName : "");
	return this.get(pendingUri, {rootUri:this.pendingUri,clientOnly:true});
}

RestOff.prototype._pendingLength = function(repoName) {
	var that = this;
	return new Promise(function(resolve, reject) {
		var uri = that.pendingRepoName + (repoName ? "?repoName=" + repoName : "");
		// Eat our own dog food
		return that.get(uri, {rootUri:that.pendingUri,clientOnly:true}).then(function(data) {
			resolve(data.length);
		}).catch(function(error) {
			reject(error);
		});
	});
}

RestOff.prototype._requestGet = function(uri) {
	var request = window.XMLHttpRequest ?
		new XMLHttpRequest() : // Mozilla, Safari, ...
		new ActiveXObject("Microsoft.XMLHTTP"); // IE 8 and older

	// ForceOffline overrides send() which now simply calls onreadystatechange
	// We use readyStateRestOff and override it to trick the request into
	// thinking it is complete. Why readyStateRestOff? Because readyState
	// has no setter (request.readyState = 4 throws an exception).
	if (uri.options.forcedOffline || uri.options.clientOnly) {
		request.__defineGetter__('readyStateRestOff', function(){return request.__proto__.DONE;});
		request.send = function() { this.onreadystatechange(); }
	} else {
		request.__defineGetter__('readyStateRestOff', function(){ return this.readyState; });
	}
	return request;
}

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
}


RestOff.prototype.uriFromClient = function(uri, restMethod, resources, options) {
	var uriResult = {
		uri: uri,
		primaryKey : "",
		primaryKeyName : this.primaryKeyName,
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
		uriResult.search = search[1]
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

	// TODO: Check if resource PK != uri pk and warn
	if (("" === uriResult.primaryKey) && (undefined !== resources) && (null !== resources) && (undefined !== resources[this.primaryKeyName])) {
		uriResult.primaryKey = resources[this.primaryKeyName];
	}
	uriResult.repoName = result;	
	if (("http:" === uriResult.repoName) || ("" === uriResult.repoName)) {
		// Note: We really can't figure out the rootUri from the uri provided when no rootUri was
		//       configured. This is because the rootUri could contain anything plus resource names
		// 	     and we don't know where the anything part stops and the resources start. So, we get
		//       this warning.
		this._logMessage("WARNING: repoName invalid. Had a uri of '" + uri + "' and a rootUri of '" + uriResult.options.rootUri + "'' which may be incorrect?");
	}
	return uriResult;
}


RestOff.prototype._pendingDelete = function(itemId) {
	return this.delete(this.pendingRepoName+"/"+itemId, {rootUri:this.pendingUri, clientOnly:true});
}

RestOff.prototype.clearAll = function(force) {
	var that = this;

	return new Promise(function(resolve, reject) {
		force = undefined === force ? false : force;
		return that._pendingLength().then(function(pendLength) {
			if ((pendLength > 0) && (false === force)) {
				reject("Submit pending changes before clearing database or call clearAll(true) to force.");
			} else {
				return that.dbService.clearAll().then(function() {
					return that.delete(that.pendingRepoName, {rootUri:that.pendingUri, clientOnly:true}).then(function(result) {
						resolve();
					}).catch(function(error) {
						reject(error);
					});
				});
			}
		});
	});
}

RestOff.prototype.clear = function(repoName, force) {
	var that = this;
	return new Promise(function(resolve, reject) {
		force = undefined === force ? false : force;
		return that._pendingLength(repoName).then(function(pendLength) {
			if ((pendLength > 0) && (false === force)) {
				reject("Submit pending changes before clearing database or call clear(repoName, true) to force.");
			} else {
				return that.dbService.clear(repoName).then(function(result) {
					return that.delete(that.pendingRepoName + "?repoName=" + repoName, {rootUri:that.pendingUri, clientOnly:true}).then(function(result) {
						resolve();
					}).catch(function(error) {
						reject(error);
					});
				});
			}
		});
	});
}

RestOff.prototype._repoGet = function(uri) {
	var that = this;
	return new Promise(function(resolve, reject) {
		var query = uri.searchOptions;
		if ("" !== uri.primaryKey) {
			query[uri.primaryKeyName] = uri.primaryKey;
		}

		if (uri.options.persistanceDisabled) {
			resolve([]);
		} else {
			return that.dbService.find(uri.repoName, query).then(function(result) {
				resolve(result);
			});
		}
	});


}

RestOff.prototype._repoFind = function(uri) {
	var that = this;
	return new Promise(function(resolve, reject) {
		var query = {};
		query[uri.keyName] = uri.primaryKey;
		return that.dbService.find(uri.repoName, query).then(function(result) {
			resolve(result);
		});
	});
}

RestOff.prototype._repoAdd = function(uri, resourceRaw) {
	var that = this;
	return new Promise(function(resolve, reject) {
		uri.resources = JSON.parse(resourceRaw); // TODO: Check for non-json result and throw error/convert/support images/etc.
		return that._repoAddResource(uri).then(function(result) {
			resolve(result);
		});
	});
}

RestOff.prototype._findBy = function(resources, id) {
	return resources.filter(function(item) {
		return item["id"] === id;
	})[0];
}


RestOff.prototype._forEachPending = function(pending, resourceArray, deletedOnServer) {
	var that = this;
	return pending.map(function(pendingRec) {
		return new Promise(function(resolve, reject) {
			// TODO: need to support the options by adding the options to the pendingRec + ADD tests for this case
			// only do call if not already deleted on the server
			var found = false;
			for(var i = 0; i < deletedOnServer.length; i++ ) {
				var deletedPrimaryKey = deletedOnServer[i][that.primaryKeyName];
				if (deletedPrimaryKey === pendingRec.primaryKey) {
					found = true;
				}
			}
			if (!found) {
				return that._restCall(pendingRec.uri, pendingRec.restMethod, undefined, pendingRec.resources).then(function(result) {
					return that._pendingDelete(pendingRec.id).then(function(result) {
						resolve(pendingRec);
					}); // TODO: REALLY NEED TO DO THE CATCH HERE. NOT DELETE FROM THE DATABASE AND DEAL WITH THE ERROR AND WARN
				});
			} else {
				return that._pendingDelete(pendingRec.id).then(function(result) {
					resolve(pendingRec);
				}); // TODO: REALLY NEED TO DO THE CATCH HERE. NOT DELETE FROM THE DATABASE AND DEAL WITH THE ERROR AND WARN
			}
		});
	});
}

RestOff.prototype._repoFindDeleted = function(serverResources, repositoryResources, deletedOnServer) {
	// TODO: Also implement this for soft delete so we don't have to loop through the entire repository
	var deletedOnServer = []; // take all repoResources and find all serverResources: anything left is "deleted" O(n x m/2)
	for (var i = 0; i < serverResources.length; i++) {
		var serverPrimaryKey = serverResources[i][this.primaryKeyName];
		var found = false;
		for (var j = 0; j < repositoryResources.length; j++) {
			var repoPrimaryKey = repositoryResources[j][this.primaryKeyName];
			if (repoPrimaryKey === serverPrimaryKey) {
				found = true;
				break;
			}
		}
		if (!found) {
			deletedOnServer.push(serverResources[i]);
		}		
	}
	return deletedOnServer;
}

RestOff.prototype._repoAddResource = function(uri) {
	var that = this;
	return new Promise(function(resolve, reject) {
		if (!uri.options.persistanceDisabled) {
			// TODO: Check for soft deletes so we don't need to get all the records from the database
			if (("" === uri.primaryKey) && ("GET" === uri.restMethod)) {  // Complete get, doing a merge because we don't have soft_delete
				var serverResources = (uri.resources instanceof Array) ? uri.resources : [uri.resources]; // make logic easier
				return that._repoGet(uri).then(function(repoResources) {
					var deletedOnServer = that._repoFindDeleted(serverResources, repoResources); // all records deleted on server but still in the repo
					return that._pendingRecords(uri.repoName).then(function(pending) {
						var actions = that._forEachPending(pending, serverResources, deletedOnServer);
						return Promise.all(actions).then(function(pendingItems) {
							// NOTE: Will alter the order of the records returned. So, if a sort
							// order was applied it will pobably not be valid after the merge.

							// Start with Resources from URI (serverResources): Will be all records for this query
							// Logic is for no soft delets or last_updated field (will always clear and add new result)
							// From serverResources for records that don't match we need to:
							//    keep the record in serverResources
							// From serverResources for records that match we need to:
							//    PUT? Replace the existing serverResources value with the one we put
							//    POST? add to serverResources
							//    DELETE? remove from serverResources
							var resourcesToAdd = [];
							for (var i = 0; i < serverResources.length; i++) {
								var primaryKey = serverResources[i][that.primaryKeyName];
								var found = false;
								for (var j = 0; j < pendingItems.length; j++) {
									if (primaryKey === pendingItems[j].primaryKey) {
										found = true;
										if ("PUT" === pendingItems[j].restMethod) {
											if (deletedOnServer.length > 0) {
												console.log("PUT adding %O.", pendingItems[j].resources);
											}

											resourcesToAdd.push(pendingItems[j].resources); // push the updated resource from pending changes
										}
										break;
									}
								}
								if (!found) { // 
									resourcesToAdd.push(serverResources[i]); // no changes, just push the resource from the server
								}
							}
							for (var k = 0; k < pendingItems.length; k++ ) {
								if ("POST" === pendingItems[k].restMethod) {
									var deletedFound = false;
									for (var b = 0; b < deletedOnServer.length; b++) {
										var deletedPrimaryKey = deletedOnServer[b][that.primaryKeyName];
										if (deletedPrimaryKey === pendingItems[k].primaryKey) {
											deletedFound = true;
											break;
										}
									}
									if (!deletedFound) {
										if (deletedOnServer.length > 0) {
											console.log(pendingItems[k].primaryKey);
											console.log(deletedOnServer);
											console.log("POST adding %O.", pendingItems[k].resources);
										}
										resourcesToAdd.push(pendingItems[k].resources); // add in any posted resources from pending BUT only if not deleted on server
									}
								}
							}
							if (deletedOnServer.length > 0) {
								console.log("Adding resources %O", resourcesToAdd);
							}

							return that.clear(uri.repoName).then(function() {
								return that.dbService.write(uri.repoName, resourcesToAdd).then(function(result){
									resolve(resourcesToAdd);
								});
							});
						});
					});
				});

			} else {
				var resourceArray = (uri.resources instanceof Array) ? uri.resources : [uri.resources]; // make logic easier

				return that.dbService.write(uri.repoName, resourceArray).then(function(result){
					resolve(uri.resources);
				})
			}
		} // else don't persist
		resolve(uri.resources);	
	});
}

RestOff.prototype._repoDeleteResource = function(uri, resolve) {
	if (!uri.options.persistanceDisabled) {
		var searchOptions = uri.searchOptions;
		if ("" !== uri.primaryKey) {
			searchOptions[uri.primaryKeyName] = uri.primaryKey;
		}
		return this.dbService.delete(uri.repoName, searchOptions).then(function(result) {
			resolve(uri.primaryKey);
		});
	}
	resolve(uri.primaryKey);
}

RestOff.prototype._createError = function(uri) {
	var request = uri.request;
	var messageDetail = request.responseText.replace(/\r?\n|\r/g, "");
	var message = request.statusText;

	if (0 === request.status) {
		message = "Network Error";
	}

	return {
		"message" : message,
		"messageDetail" : messageDetail,
		"status": request.status,
		"uri": uri.uriFinal
	};
}

RestOff.prototype.autoQueryParamSet = function(name, value) {
	this._autoParams[name] = value;
	return this;
}

RestOff.prototype.autoQueryParamGet = function(name) {
	return this._autoParams[name];
}

RestOff.prototype.autoHeaderParamSet = function(name, value) {
	this._autoHeaders[name] = value;
	return this;
}

RestOff.prototype.autoHeaderParamGet = function(name) {
	return this._autoHeaders[name];
}

// TODO: Maybe use a library. See http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
RestOff.prototype._guid = function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

// TODO: Add database calling type
RestOff.prototype._pendingAdd = function(uri) {
	var that = this;
	return new Promise(function(resolve, reject) {
		var result = {
			"id" : that._guid(),
			"restMethod" : uri.restMethod,
			"resources" : uri.resources,
			"clientTime" : new Date(),
			"uri" : uri.uriFinal,
			"repoName" : uri.repoName,
			"primaryKey" : uri.primaryKey
		}

		if (!uri.options.persistanceDisabled) {
			// Eat our own dog food
			return that.post(that.pendingUri + that.pendingRepoName, result, {rootUri:that.pendingUri,clientOnly:true}).then(function(result) {
				resolve(result);
			}).catch(function(error) {
				reject(error);
			}); 
		} else {
			resolve(result);
		}
	});
}

RestOff.prototype._requestHeaderSet = function(request) {
	var autoHeaders = this._autoHeaders;
	Object.keys(autoHeaders).forEach(
		function(key) {
			request.setRequestHeader(key, autoHeaders[key]); // TODO: Write a test to cover this
		}
	);
}

RestOff.prototype._uriAddRequest = function(uri, request) {
	uri.request = {
		readyState : request.readyStateRestOff,
		status : request.status,
		statusText : request.statusText,
		response: request.response,
		responseText: request.responseText
	};
	return uri;
}

RestOff.prototype._dbDelete = function(uri, resolve, reject) {
	var request = uri.request;
	switch (request.status) {
		case 200: case 202: case 204: // TODO: Write test for 202 and 204
			this._isOnline = true;
			this._repoDeleteResource(uri, resolve);
		break;
		case 404:
			this._isOnline = true;
			this._repoDeleteResource(uri, resolve); // 404 but will remove from client anyway
		break;
		case 0:
			var clientOnly = uri.options.clientOnly;
			if (uri.options.forcedOffline || clientOnly) {
				if (!clientOnly) {
					var that = this;
					this._isOnline = false;
					this._pendingAdd(uri).then(function(result) {
						that._repoDeleteResource(uri, resolve);
					});
				} else {
					this._repoDeleteResource(uri, resolve);
				}
			} else {
				this._isOnline = null;
				reject(this._createError(uri));
			}		
		break;
		default:
			console.log ("WARNING: Unsupported HTTP response.");
	}
}

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
			break;
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
				console.log ("WARNING: Unsupported HTTP response.");
				reject();
		}
	});
}

RestOff.prototype._pendingRepoAdd = function(uri, clientOnly,resolve, reject) {
	if (!clientOnly) {
		var that = this;
		return this._pendingAdd(uri).then(function(result) {
			return that._repoAddResource(uri).then(function(result) {
				resolve(result);
			});
		});
	} else {
		return this._repoAddResource(uri).then(function(result) {
			resolve(result);
		});
	}
}

RestOff.prototype._dbPost = function(uri, resolve, reject) {
	var request = uri.request;
	switch (request.status) {
		case 201:
			this._isOnline = true;
			return this._repoAddResource(uri).then(function(result) {  // TODO: IMPORTANT!!! Use request.response: need to add backend service to test this
				resolve(result);
			});
		break;
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
}

RestOff.prototype._dbPut = function(uri, resolve, reject) {
	var request = uri.request;
	switch (request.status) {
		case 200:
			this._isOnline = true;
			resolve(this._repoAddResource(uri)); // TODO: IMPORTANT!!! Use request.response: need to add backend service to test this
		break;
		default:
			var finalStatus = request.status;
			var finalMessage = request.statusText;
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
}

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
					break;
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
}

RestOff.prototype.delete = function(uri, options) {
	return this._restCall(uri, "DELETE", options);
}

RestOff.prototype.get = function(uri, options) {
	return this._restCall(uri, "GET", options);
}

RestOff.prototype.post = function(uri, resource, options) {
	return this._restCall(uri, "POST", options, resource);
}

RestOff.prototype.put = function(uri, resource, options) {
	return this._restCall(uri, "PUT", options, resource);
}

restlib.restoff = restoff; 