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

RestOffService.prototype.write = function(repoName, resources, options) {
	var that = this;
	return new Promise(function(resolve, reject) {
		var pkName = that.pkNameGet(repoName, options);
		resources = (resources instanceof Array) ? resources : [resources]; // make logic easier
		resources.forEach(function(resource) {
			var primaryKey = resource[pkName];
			if (undefined === primaryKey) {
				reject("Primary key '" + pkName + "' required for resource or the resource has an invalid primary key.");
				// TODO: Need to pre-validate all records and then notify when one has an issue?
				// TODO: Currently, we reject in the middle of an update which is 'bad'
				return;
			} else {
				that.dbRepo.write(repoName, pkName, resource);
			}
		});
		resolve(resources);
	});
};

RestOffService.prototype.clearAll = function() {
	var that = this;
	return new Promise(function(resolve) {
		resolve(that.dbRepo.clearAll());
	});
};

RestOffService.prototype.clear = function(repoName) {
	var that = this;
	return new Promise(function(resolve) {
		resolve(that.dbRepo.clear(repoName));
	});
};

RestOffService.prototype.delete = function(repoName, query) {
	var that = this;
	return new Promise(function(resolve) {
		resolve(that.dbRepo.delete(repoName, query));
	});
};

RestOffService.prototype.findNp = function(repoName, query) {
	return this.dbRepo.read(repoName, query);
};

RestOffService.prototype.find = function(repoName, query) {
	var that = this;
	return new Promise(function(resolve) {
		resolve(that.dbRepo.read(repoName, query));
	});
};

restlib.restoffService = restoffService;
