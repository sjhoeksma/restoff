function restoffService(config) {
	var that = Object.create(RestOffService.prototype);
	that._dbRepo = (undefined !== config) ? config.dbRepo ? config.dbRepo : lowdbRepo() : lowdbRepo();

	return that;
}

function RestOffService() {}
RestOffService.prototype = Object.create(Object.prototype, {
	dbRepo: { get: function() { return this._dbRepo; }}
});

RestOffService.prototype._primaryKeyFor = function(uri, resource) {
	var result = resource[uri.primaryKeyName];
	if (undefined === result) {
		console.log("WARNING: resource %O did not have a primaryKey " + this.primaryKeyName, resource); // TODO: Write tests for this
	}
	return result;
}

RestOffService.prototype.delete = function(repoName) {
	var that = this;
	return new Promise(function(resolve, reject) {
		resolve(that.dbRepo.delete()); // repoName, searchOptions
	});
}

// RestOffService.prototype.getRepo = function(repoName, primaryKey) {
// 	var uri = {
// 		primaryKeyName: "id",
// 		repoName : repoName,
// 		primaryKey: primaryKey,
// 		searchOptions: {}
// 	};
// 	return this.get(uri);
// }

// RestOffService.prototype.get = function(uri) {
// 	var query = uri.searchOptions;
		
// 	if ("" !== uri.primaryKey) {
// 		query[uri.primaryKeyName] = uri.primaryKey;
// 	}
// 	console.log(query);
// 	return this.dbRepo.read(uri.repoName, query);
// }

// RestOffService.prototype.addRepo = function(repoName, resources) {
// 	var uri = {
// 		primaryKeyName : "id",
// 		repoName: repoName,
// 		searchOptions: {}
// 	};

// 	return this.add(uri, resources);
// }

// RestOffService.prototype.add = function(uri, resources) {
// 	var that = this;
// 	// resources.forEach(function(resource) {
// 		var resource = resources;
// 		var primaryKey = that._primaryKeyFor(uri, resource);
// 		that.dbRepo.write(uri.repoName, uri.primaryKeyName, primaryKey, resource);
// 	// });
// }

restlib.restoffService = restoffService;



// RestOff.prototype._repoGet = function(uri) {
// 	var query = uri.searchOptions;
// 	if ("" !== uri.primaryKey) {
// 		query[uri.primaryKeyName] = uri.primaryKey;
// 	}
// 	return uri.options.persistanceDisabled ? [] : this.dbRepo.read(uri.repoName, query);
// }

// RestOff.prototype._repoFind = function(uri) {
// 	return this.dbRepo.find(uri.repoName, uri.primaryKeyName, uri.primaryKey)	
// }

// RestOff.prototype._repoAdd = function(uri, resourceRaw) {
// 	var that = this;
// 	return new Promise(function(resolve, reject) {
// 		uri.resources = JSON.parse(resourceRaw); // TODO: Check for non-json result and throw error/convert/support images/etc.
// 		return that._repoAddResource(uri).then(function(result) {
// 			resolve(result);
// 		});
// 	});
// }

// RestOff.prototype._repoAddAll = function(uri, resourceArray) {
// 	var that = this;
// 	resourceArray.forEach(function(resource) {
// 		var primaryKey = that._primaryKeyFor(resource);
// 		that.dbRepo.write(uri.repoName, that.primaryKeyName, primaryKey, resource);
// 	});
// }

// RestOff.prototype._repoAddResource = function(uri) {
// 	var that = this;
// 	return new Promise(function(resolve, reject) {
// 		var resourceArray = (uri.resources instanceof Array) ? uri.resources : [uri.resources]; // make logic easier
// 		if (!uri.options.persistanceDisabled) {
// 			// TODO: Check for soft deletes so we don't need to get all the records from the database
// 			if (("" === uri.primaryKey) && ("GET" === uri.restMethod)) {  // Complete get, doing a merge because we don't have soft_delete
// 			     return that.clear(uri.repoName).then(function() {  // TODO: What do we do when there are pending changes
// 			     	that._repoAddAll(uri, resourceArray);
// 					resolve(uri.resources);
// 			     });
// 			} else {
// 				that._repoAddAll(uri, resourceArray);
// 			}
// 		} // else don't persist

// 		resolve(uri.resources);
// 	});
// }

// RestOff.prototype._repoDeleteResource = function(uri) {
// 	if (!uri.options.persistanceDisabled) {
// 		var searchOptions = uri.searchOptions;
// 		if ("" !== uri.primaryKey) {
// 			searchOptions[uri.primaryKeyName] = uri.primaryKey;
// 		}
// 		this.dbRepo.delete(uri.repoName, searchOptions);
// 	}
// 	return (uri.primaryKey);
// }