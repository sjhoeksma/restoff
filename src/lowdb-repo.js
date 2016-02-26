function lowdbRepo(config) {
	var that = Object.create(LowdbRepo.prototype);
	that._dbName = (undefined !== config) ? config.dbName ? config.dbName : "restoff" : "restoff";
	that._low = low(that._dbName, { storage: low.localStorage }); // local storage	
	return that;
}

function LowdbRepo() {}
LowdbRepo.prototype = Object.create(Object.prototype, {
	dbName: {
		get: function() { return this._dbName; },
		set: function(value) { this._dbName = value; }
	},
	dbEngine: { get: function() { return this._low; }},
	deleteSomeTime: { get: function() { return this._isOnline === true; }}
});

restlib.lowdbRepo = lowdbRepo;

LowdbRepo.prototype.length = function(repoName) {
	return this._low(repoName).size();
}

LowdbRepo.prototype.clear = function(repoName) {
	delete this._low.object[repoName];
	this._low.write()
}

LowdbRepo.prototype.clearAll = function() {
	this._low.object = {};
	this._low.write();
}

LowdbRepo.prototype.find = function(repoName, keyName, primaryKey) {
	var query = {};
	query[keyName] = primaryKey;
	return this._low(repoName).find(query);
}

LowdbRepo.prototype.read = function(repoName) {
	return this._low(repoName).value();
}

LowdbRepo.prototype.write = function(repoName, keyName, primaryKey, resource) {
	// TODO: There is no consolodiation at this time
	//       So, right now, we overwrite whatever is there without
	//       verifying anything has changed.
	if (undefined === this.find(repoName, keyName, primaryKey)) {
		this._low(repoName).push(resource);
	} else {
		var query = {};
		query[this.primaryKeyName] = keyName;
		this.dbEngine(repoName)
			.chain()
	  		.find(query)
			.assign(resource)
			.value();
	}
}