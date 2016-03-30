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

RestOffService.prototype.clearSync = function(repoName) {
	return this.dbRepo.clear(repoName);
};

RestOffService.prototype.clearAllSync = function() {
	return this.dbRepo.clearAll();
};

RestOffService.prototype.deleteSync = function(repoName, query) {
	return this.dbRepo.delete(repoName, query);
};

RestOffService.prototype.findSync = function(repoName, query) {
	return this.dbRepo.read(repoName, query);
};

RestOffService.prototype.writeSync = function(repoName, resources, options) {
	var pkName = this.pkNameGet(repoName, options);
	resources = (resources instanceof Array) ? resources : [resources]; // make logic easier
	resources.forEach(function(resource) {
		var primaryKey = resource[pkName];
		if (undefined === primaryKey) {
			// TODO: Provide a call back for logging so user can log/notify/etc.
			// TODO: Allow Program to continue execution?
			throw new Error("Primary key '" + pkName + "' missing for resource or the resource has an invalid primary key."); // TODO: Write Test for this
		}
	});
	var that = this;
	if (this.reconSettings.softDeleteFieldName !== "") {
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
