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
    pendingRepoName: {
        get: function() { return this._options.pendingRepoName; }
    },
    pendingUri: {
        get: function() { return this._options.pendingUri; }
    }
});

RestoffPending.prototype.uriFromClient = function(uri, restMethod, resources, options) {

};

RestoffPending.prototype.pendingGet = function(repoName) {
    var pendingUri = this.pendingRepoName + (repoName ? "?repoName=" + repoName : "");
    return this._restOff.getSync(pendingUri, {rootUri:this.pendingUri,clientOnly:true});
};

RestoffPending.prototype.pendingPost = function(resource) {
    return this._restOff.postSync(this.pendingUri + this.pendingRepoName, resource, {rootUri:this.pendingUri,clientOnly:true,primaryKeyName:"id"});
};


RestoffPending.prototype.pendingCount = function(repoName) {
    var pending = this.pendingGet(repoName);
    return pending ? pending.length : 0;
};

RestoffPending.prototype.pendingDelete = function(itemId) {
    var uri = this.pendingRepoName + (itemId ? "/"+itemId : "");
    return this._restOff.deleteSync(uri, {rootUri:this.pendingUri, clientOnly:true});
};

RestoffPending.prototype.pendingClear = function(repoName) {
    var uri = this.pendingRepoName + "?repoName=" + repoName;
    return this._restOff.deleteSync(uri, {rootUri:this.pendingUri, clientOnly:true});
};

RestoffPending.prototype.pendingAdd = function(uri) {
    var result = {
        "id" : uuidGenerate(),
        "restMethod" : uri.restMethod,
        "resources" : uri.resources,
        "clientTime" : new Date(),
        "uri" : uri.uriFinal,
        "repoName" : uri.repoName,
        "primaryKey" : uri.primaryKey
    };

    if (!uri.options.persistenceDisabled) { // TODO: Write a test for this
        var original = this._restOff.dbService.findSync(uri.repoName, {id:uri.primaryKey}); // TODO: Remove direct access to dbService and use restoff.getSync call
        if (undefined !== original[0]) {
            result.original = JSON.parse(JSON.stringify(original[0])); // need to clone original record
        }
        return this.pendingPost(result);
    } else {
        return result;
    }
};

restlib.restoffPending = restoffPending;
