function restoffUri(restOff) {
    var that = Object.create(RestoffUri.prototype);
    that._restOff = restOff;
    return that;
}

function RestoffUri() {}
RestoffUri.prototype = Object.create(Object.prototype, {
});

RestoffUri.prototype._uriGenerate = function(uri) {
    var result = uri.uri;
    if (result.indexOf("http") === -1) { // missing domain/protocol/etc.
        result = uri.options.rootUri + result;
    }
    var autoParams = this._restOff._autoParams;
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

RestoffUri.prototype.uriFromClient = function(uri, restMethod, resources, options) {
    var uriResult = {
        uri: uri,
        primaryKey : "",
        restMethod : restMethod,
        resources : resources,
        options : Object.assign({}, this._restOff._options, options),
        searchOptions : {}
    };

    if (!uriResult.options.rootUri.endsWith("/")) {
        uriResult.options.rootUri = uriResult.options.rootUri + "/";
    }
    uriResult.uriFinal = this._uriGenerate(uriResult);
    var result = uri.replace(uriResult.options.rootUri, "");

    var search = result.split("?");
    if (search.length > 1) {
        result = search[0];
        uriResult.search = search[1];
        uriResult.search.split("&").forEach(function(item) {
            var itemParts = item.split("=");
            if (2 === itemParts.length) {
                uriResult.searchOptions[itemParts[0]] = itemParts[1];
            } else {
                logMessage("WARNING: Invalid search query in uri " + uriResult.uriFinal + "'."); // TODO: Write Test for this.
            }
        });
    }

    var uriPrimaryKey = result.split("/");
    if (uriPrimaryKey.length > 1) {
        result = uriPrimaryKey[0];
        uriResult.primaryKey = uriPrimaryKey[1]; // TODO Support nested resources
    }

    var pkName = this._restOff._pkNameGet(uriResult);
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
        logMessage("WARNING: repoName invalid. Had a uri of '" + uri + "' and a rootUri of '" + uriResult.options.rootUri + "'' which may be incorrect?");
    }
    return uriResult;
};
restlib.restoffUri = restoffUri;