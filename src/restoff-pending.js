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
          if (undefined !== pendingFound[0].original) {
            result.original = JSON.parse(JSON.stringify(pendingFound[0].original)); // need to clone original record
          } else {
            result.original = JSON.parse(JSON.stringify(pendingFound[0].resources)); // need to clone original record
          }
          this.pendingDelete(pendingFound[0].id);
        } else {
					//THIS CREATES THE REPO
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
