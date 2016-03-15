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

LowdbRepo.prototype.write = function(repoName, keyName, primaryKey, resource) {
	// TODO: There is no consolodiation at this time
	//       So, right now, we overwrite whatever is there without
	//       verifying anything has changed.
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
