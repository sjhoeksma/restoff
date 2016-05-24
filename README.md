# **RESToff**

Synchronize client/server data using your existing RESTful APIs.

* Under MIT license.
* Database agnostic and schema-less.
	* Works against different [database types][database-definition-link] (SQL, NoSQL, Graph, etc.) and service ([MySQL][mysql-home-link], [SQL Server][sql-server-home-link], [Oracle][oracle-home-link], [Postgress][postgress-home-link], [MongoDB][mongodb-home-link], [Redis][redis-home-link], etc.).
	* Supports multiple databases sources.
	* No need to propagate schema changes to a client.
* Reconciliation
	* Automatic reconciliation of offline changes.
	* In ```clientOnly``` mode, **RESToff** automatically provides a complete RESTful offline service for your app.
	* Reconciliation works without soft deletes or last modified date columns.
		* Note: reconciliation is much faster with soft delete and last modified date columns available.
			* Conflicts are resolved by default by saving both versions. Setting concurrency to 'overwrite' changes
				this behavior to optimistic, last-one-wins strategy where merge conflicts are overwritten
* Supports synchronous RESTful calls.
	* Simplifies source code and improves client responsiveness.
* Supports resources in the following formats:
	* Json
* Works in following frameworks
    * **Standalone** - **RESToff** can be used without a framework.
    * **[Angular][angular-home-link]** - **RESToff** wrapped in an Angular 1 provider.
* Limitations and Expectations:
	* Every resource must have one unique ```primaryKey``` field.
	* Best to follow [RESTful best known practices][rest-best-practices]
* TODO
	* Tests to verify order of pending changes
	 	* edit record A, edit A again: 2nd edit also contains 1st edit
* Next features
	* Support rolling back a pending change
	* Replace concurrency option with a plugin model
		* This also will allow support for custom merge conflict resolution
	* support non-standard get/put/post.
		- Example: a request GET actually does a delete.
	* support put/post updates where resource is changed on the server.
		- requires better mockable REST api backend for testing.
	* support nested resources (example: /users/45/addresses).
	* support non-standard restful api: ability to map a user.

## RestOff Usage


Examples:

```javascript
// Create a restoff service instance.
var roff = restoff({
	rootUri : "http://api.example.com/" // Required Option
});

roff.get("users").then(function(user) {
	console.log(roff.getRepo("users")); // Access repository directly
});

roff.deleteOne("users",{id:301378d5}).then(function(deletedUserId) {
	console.log("User " + deletedUserId + " deleted");
});

var aUser = {
	"id" : "ffa454",
	"first_name": "Happy",
	"last_name": "User"
}

roff.post("users", aUser).then(function(user){
	console.log("Posted user %O.", user);
});

aUser.last_name = "put";

roff.put("users/ffa454", aUser).then(function(user){
	console.log("Put user %O.", user);
});

```

Let's synchronize subsets of resources on the backend service using the user id:

```javascript
var roff = restoff({
	"rootUri" : "http://api.example.com/"
});

function synchronize(roff, userId) {
	roff.get("users/" + userId);
	roff.get("books?ownedby="+userId);
	roff.get("addresses?userid="+userId);
	...
	roff.forcedOffline = true; // Let's go offline or unplug from the internet

	roff.get("users/" + userId).then(function(user) {
		// Yep! We can work offline.
	});
}
```

## Resoff Reconciliation in Detail

| Row  | Action                       | 1) Server Only Change            | 2) Client Only Change            | 3) Changes in Both                 |
| ---- | ---------------------------- | ---------------------------------| ---------------------------------| -----------------------------------|
| A    | Insert (Post)                | Get and Overwrite on Client      | Post and Overwrite on Server     | Same Primary Key. Apply B3.        |
| B    | Update (Post/Put)            | Get and Overwrite on Client      | Post and Overwrite on Server     | Brent Reconciliation               |
| C    | Delete                       | Delete from Client               | Delete on Server                 | Nothing to Do: Both deleted        |
| D    | Delete with Update on client |                                  |                                  | Honor Delete: ignore client update |

* A1, A2, B1, B2, C1, C2, C3: No potential merge conflicts
* A3: This is the case where the same primary key was generated on each client. In this case we will simply view it as a reconciliation of changes because:
	* You should be using UUIDs for keys and the chance of collisions is very low. If you are using incrementing IDs, then you will need an algorithm to generate these IDs uniquely on the client. See the ```generateId``` function.
* D3: The client/server deleted a record that was updated on the server/client. In this case, we honor the delete.
* B3: Using Brent reconciliation which means we assign a new resource id (primaryKey) to the resource and post it.
	* This does not work with hierarchical data. The intent is to allow a user to take advantage of the existing User Interface of an Application to deal with the merge conflict.
	* TODO: We will be providing a call back that lets the developer provide a custom merge conflict screen.

## **RESToff** Options

### rootUri [Required]

```rootUri``` is appended to RESTful calls when an incomplete ```uri``` is provided. ```rootUri``` is also used, under the hood, to determine the name of the repository.

Examples:

```javascript
var roff = restoff({
	"rootUri" : "http://api.example.com/",
});

// uri becomes http://api.example.com/users
// repository name is users
roff.get("users").then(function(result){
	// use the result here
}

// uri is http://another.example.com/users
// repository name is users
roff.get("http://another.example.com/users").then(function(result){
	// use the result here
}
```

### persistenceDisabled [Optional]

When true, storage of RESTful results on the client are disabled.

* Effectivly bypass the core feature of **RESToff** causing it to act like a standard http library.
* Useful for debugging.

Example configuration:

```
var roff = restoff({
	rootUri : "http://api.example.com/",
	persistenceDisabled	: true
});
```

### clientOnly [Optional]

Creates a backend RESTful service on your client.

* Allows your RESTful API to run 100% on the client.
* Note: By design, the ```pending``` repository runs in ```clientOnly``` mode meaning the pending RESTful endpoint never hits the backend service.

```javascript
var rest = restoff({
	"rootUri" : "http://api.example.com/",
	"clientOnly" : true
});

rest.put("users", { Name : "Happy User"}).then(function(result) {
	rest.get("users").then(function(result)) {
		// never hit a backend RESTful service
	});
});
```

### onCallPending(pendingAction, uri) [Optional]

```onCallPending``` is the function called by **RESToff** before a pending call is executed. Provided is all information about the pending action and the uri record.

// TODO: Provide the json format for pendingAction and the uri record.

```javascript
var rest = restoff({
	rootUri: "http://api.example.com/",
	onCallPending: function(pendingAction, uri) {
		console.log("Pending will execute %O %O", pendingAction, uri);
	}
});
```

### 	dbService.primaryKeyName or options {primaryKeyName:"name"} [Required: Default id]

```primaryKeyName``` is the name of the primary key field for a given repository.

* **RESToff** requires every repository to have a single primary key
 	* the primary key can't be based on a composite key
* The default value is 'id'.

You can globally set the ```primaryKeyName``` or on a per RESTful call basis:

```javascript
var roff = restlib.restoff({
	rootUri: "api.example.com",
	dbService: {
		primaryKeyName : "ID",
	},
});

roff.get("users").then(function(result) {
	console.log("Primary key name used was ID.");
});

roff.get("users", {primaryKeyName:"USER_ID"}).then(function(result) {
	console.log("Primary key name used was USER_ID.");
});
```

### 	dbService.primaryKeyNotOnPost or options {primaryKeyNotOnPost:"true"} [OPTIONAL]

```primaryKeyNotOnPost``` is a boolean indication that we should not send a primary key on post. Some servers
create a primary key on post and send it back via response.


### forcedOffline [Optional]

Forces the application to run in offline mode.

* Useful to see how an application behaves when it is offline.
	* Example: Reload all information, go offline, and see how the application behaves.
* ```isOnline``` will return false when ```forcedOffline``` is true.

```javascript
var roff = restoff({
	rootUri: "http://api.example.com/"
});

synchronize(roff, "user456");
roff.forceOffline();
if (!roff.isOnline) {
	console.log ("We are offline!");
}
```
NOTE: There is a slight difference between ```clientOnly``` mode and ```forcedoffline``` mode.

* In ```forcedOffline``` mode, **RESToff** will store any put/post/delete actions in the ```pending``` repository.
* In ```clientOnly``` mode, Retsoff will **not** store any put/post/delete actions in the ```pending``` repository.

### generateId [Optional]

```generateId``` is the function called by **RESToff** to generate a primary key. Bey default, restOff uses ```RestOff.prototype._guidGenerate()``` but you can define your own.

```javascript
var rest = restoff({
	rootUri: "http://api.example.com/",
	generateId: function() { return Math.floor((1 + Math.random()) * 0x10000); } // not a great unique key generator
});
```

### onReconciliation(completedAction) [Optional]

```onReconciliation``` is the function called by **RESToff** after reconciliation of a given resource is complete.

```javascript
var rest = restoff({
	rootUri: "http://api.example.com/",
	onReconciliation: function(completedAction) {
	  console.log("The following completed action was reconciled and saved to the server %O.", completedAction);
	}
});
```

Note: Placed features will provide a more robust reconciliation process allowing the developer to provide their own custom reconciliation process. Currently, **RESToff** always applies Brent Reconciliation.

### concurrency [Optional]

The ```concurrency``` option defaults to null and conflicts are resolved through Brent reconciliation (keep both versions)
Setting ```concurrency = 'overwrite'``` will result in conflicts resolved by being overwritten by the local version

### pendingUri and pendingRepoName

When offline, **RESToff** places any put/post/delete RESTful operations in a ```pending``` repository. **RESToff** uses it's own persistence engine meaning it calls itself using get/post/delete.

Use ```pendingUri``` and ```pendingRepoName``` to configure the URI and repository name of the ```pending``` repository.

* Note: In ```clientOnly``` mode, no changes are recorded in the ```pending``` repository.


### resourceFilter(dataArray,uri):dataArray [Optional]

The ```resourceFilter``` option defaults to null, when set to an function we can manipulate the received resourcedata before writing it to the lowDB. Systems like Backendless.comm return paged REST results to reduce long waits.

```javascript
//Example for BackendLess.com ,plain functions removes all internal objects from the code
var rest = restoff({
	rootUri: "http://api.example.com/",
	resourceFilter: function(resources,uri){
	  if (resources.hasOwnProperty('totalObjects') && resources.hasOwnProperty('data')) {
			resources=resources.data;
			for (var i=0;i<resources.length;i++) resources[i]=self.plain(resources[i]);
	 } else {
		 resources = self.plain(resources);
	 }

	 return resources;
 }
});
```

### errorHandler(errorMessage) [Optional]

The ```errorHandler``` option defaults to null, when set to a function it will we called allowing you to intercept the error, before
it is passed to the reject part of promise.

```javascript
var rest = restoff({
	rootUri: "http://api.example.com/",
  errorHandler: function(error) {
	 /* error layout
	   error = {
		    message: message,
	 	    messageDetail: messageDetail,
		    status: request.status,
				response:request.response || request.responseText,
		    uri: uri.uriFinal,
		    restMethod: uri.restMethod
	   };
	*/
	  
	}
});
```

### pageHandler(resources,uri):nextPageURL [Optional]

The ```pageHandler``` option defaults to null, when set to a function it will we called allowing you to handle paged results form your backend system. The url returned by this functions will be loaded and added to the result set.

```
//Example for BackendLess.com
var rest = restoff({
	rootUri: "http://api.example.com/",
	pageHandler : function(resources,uri) {
		if (resources.hasOwnProperty('totalObjects') && resources.hasOwnProperty('data')  && resources.nextPage ) {
			var p =  uri.uriFinal.indexOf('?');
			var ret = (p>0 ? uri.uriFinal.substr(0,p) : uri.uriFinal) + "?" + resources.nextPage.substr( resources.nextPage.indexOf('?')+1) ;
			return ret;
		}
		return false;
	}
});
```		

### defaultParams [Optional]
The ```defaultParams``` option defaults to null, but when set an object, the key values will be used as parameters in all
rest calls. See also ```autoQueryParamSet```


### defaultHeaders [Optional]
The ```defaultHeader``` option defaults to null, but when set an object, the key values will be used as header parameters in all
rest calls. See also ```autoHeaderParamSet```


## **RESToff** Methods

### autoQueryParamSet(name, value)

A parameter of ```name``` with ```value``` will be added/appended to **EVERY** RESTful api call. Useful for adding parameters such as an access token.

Example usage:

```javascript
var roff = restoff({
	rootUri : "http://api.example.com/"
});
roff.autoQueryParamSet("access_token", "rj5aabcea");

// uri becomes http://api.example.com/users?access_token=rj5aabcea
roff.get("users").then(function(user)) {
	...
}
```

### autoQueryParamGet(name)

Returns the value of the query parameter with the provided ```name```.

Example usage:

```javascript
var roff = restoff({
	rootUri : "http://api.example.com/"
});
roff.autoQueryParamSet("access_token", "rj5aabcea");
var paramValue = roff.autoQueryParamGet("access_token");
```

TODO: Add autoQueryParameters as an option.

### autoHeaderParamSet(name, value)

A header of ```name``` with ```value``` will be added to the header of every RESTful api call.  Useful for adding parameters such as an access token.

Example usage:

```javascript
var roff = restoff({
	rootUri : "http://api.example.com/"
});
roff.autoHeaderParamSet("access_token", "rj5aabcea");
```

### autoHeaderParamGet(name)

Returns the value of the header parameter with the provided ```name```.

Example usage:

```javascript
var roff = restoff({
	rootUri : "http://api.example.com/"
});
roff.autoHeaderParamSet("access_token", "rj5aabcea");
var headerValue = roff.autoHeaderParamGet("access_token");
```

TODO: Add autoHeaderParams as an option.

### clear(repoName, [forced])

Clears the cache of the given repository name if the repository exists.

* Does not clear the repository if there are pending changes.
	* Optional parameter ```forced``` - Pass a value of ```true``` to force clearing a repository even if it has pending changes.
* Does not create a repository named ```repoName``` to the repository if it doesn't exist.

Example:

```javascript
var roff = restoff({
	rootUri : "http://api.example.com/"
});
roff.clear("users", true);
console.log("User repository, even if it had pending, was cleared ")
```

### clearAll([forced])

Clears the cache of all repositories.

* Does not clear any repositories if even one of them have pending changes.
	* Optional parameter ```forced``` - Pass a value of ```true``` to force clearing all repositories even if there are any pending changes.

Example:

```javascript
var roff = restoff({
	rootUri : "http://api.example.com/"
});
roff.clearAll(true);
console.log("User repository, even if it had pending, was cleared ");
```

### delete(uri, [options]), deleteRepo(uri, [options]),  deleteOne(uri, resource, [options]),

* ```delete(uri, [options])``` asynchronously deletes a resource from a remote server and in the local repository.
* ```deleteRepo(uri, [options])``` synchronously deletes a resource from in the local repository.
* ```deleteOne(uri, resource, [options])``` asynchronously deletes a resource from a remote server using primarykey for uri extention and in the local repository.

Note:

* A 404 (not found) is "ignored" and the resource is still considered removed from the local repository.
* If ```delete``` is called on a non-existent repository, an empty repository is created.

Example usage:

```javascript
var roff = restoff();
return roff.delete("http://test.development.com:4050/users/553fdf")
.then(function(result){
	// user was deleted
});

roff.forcedOffline = true;
var result = roff.deleteRepo("http://test.development.com:4050/users/553fdf");
```

### get(uri, [options]), getRepo(uri, [options]) getOne(uri, resource, [options])

* ```get(uri, [options])``` asynchronously retrieves a resource from a remote server. Uses the local repository when offline.
* ```getRepo(uri, [options])``` synchronously retrieves a resource from the local repository.
* ```getOne(uri, resource, [options])``` asynchronously retrieves one resource using primarykey for uri extention from a remote server. Uses the local repository when offline.

Example usage:

```javascript
var roff = restoff();
return roff.get("http://test.development.com:4050/testsweb/testdata/users")
.then(function(result){
	// use the result here
});

roff.forcedOffline = true;
var result = roff.getRepo("http://test.development.com:4050/testsweb/testdata/users");

var user = {
    "id" : "ffa454",
    "first_name": "Happy",
    "last_name": "User"
}
return roff.getOne("http://test.development.com:4050/testsweb/testdata/users",user)
.then(function(result){
	// use the result of single get here
});
```

### post(uri, resource, [options]), postRepo(uri, resource, [options]), postOne(uri, resource, [options])

* ```post(uri, resource, [options])``` asynchronously posts a resource to a remote server and in the local repository adding the resource if it doesn't exist or overwriting the existing resource.
* ```postRepo(uri, resource, [options])``` synchronously posts a resource in the local repository adding the resource if it doesn't exist or overwriting the existing resource.
* ```postOne(uri, resource, [options])``` asynchronously posts a resource to a remote server using the primarykey for uri extention and in the local repository adding the resource if it doesn't exist or overwriting the existing resource.

* When online, ```post(...)``` calls will happen immediately.
* With ```postRepo(...)```, updates will happen when a ```get(...)``` is executed on that resource.

Example usage:

```javascript
var roff = restoff();
var newUser = {
	"id" : "ffa454",
	"first_name": "Happy",
	"last_name": "User"
}

return roff.post("http://test.development.com:4050/users", newUser)
.then(function(result){
	// use the result here
});

roff.forcedOffline = true;
var result = roff.postRepo("http://test.development.com:4050/users", newUser)


return roff.postOne("http://test.development.com:4050/testsweb/testdata/users",newUser)
.then(function(result){
	// use the result of single post here
});
```

### put(uri, resource, [options]), putRepo(uri, resource, [options]), putOne(uri, resource, [options]),

* ```put(uri, resource, [options])``` asynchronously puts a known resource on a remote server and in the local repository updating the resource id provided in the uri.
* ```putRepo(uri, resource, [options])``` synchronously puts a known resource in the local repository updating the resource id provided in the uri.
* ```put(uri, resource, [options])``` asynchronously puts a known resource on a remote server using the primarykey for uri extention and in the local repository updating the resource id provided in the uri.

Example usage:

```javascript
var roff = restoff({
	"rootUri" : "http://test.development.com:4050/"
});
var existingUser = {
	"id" : "ffa454",
	"first_name": "Happy",
	"last_name": "User"
}

return roff.put("users/ffa454", existingUser)
.then(function(result){
	// use the result here
});

roff.forcedOffline = true;
var result = roff.putRepo("users/ffa454", existingUser)

return roff.putOne("http://test.development.com:4050/testsweb/testdata/users",existingUser)
.then(function(result){
	// use the result  here
});
```

### uriFromClient(uri)

restOff may add additional query parameters when restOff.get(uri) is called. Use this method to see the final uri sent to the backend server.

Example usage:

```javascript
var roff = restoff().autoQueryParamSet("access_token", "rj5aabcea");
var actualUri = roff.uriFromClient("http://test.development.com:4050/emailaddresses");
expect(actualUri)).to.equal("http://test.development.com:4050/emailaddresses?access_token=rj5aabcea");
```

### clone(config)

you may need a clone of the restOff with add other config. config parts of orginal are copied to clone.

Example usage:

```javascript
var roff = restoff({rootUri:'http://test.development.com:4050'});
var cloneOff = roff.clone({rootUri:'http://test.production.com:4050'});
```

# FAQ

* What is the difference between ```offlineOnly``` and ```forcedOffline```?
	- ```forcedOffline``` will line up any pending changes that are then synchronized when the client comes back online.
	- ```offlineOnly``` does not log any "pending changes" because the repository will never be synchronzied with a backend service.

# Developoment Setup

Want to help out? Here is what you need to do to get started.

// TODO: Finish this part of documentation

## Using In Your Projects

Change directory to your node project.

    $ npm install --save restoff


## Setup

```
$ npm install
$ npm install -g json-server   // for testing
```

### Update Node Module Dependencies

```
$ npm outdated
```

### Node Modules Used

* [jsonplaceholder][jsonplaceholder-link]

### Continuous Rebuild and Testing

See ./dist for files we build.

```
$ gulp
```

#### Test

```
$ gulp webtests
```

#### Test Server

Read documentation in gulpfile.js to see how to setup automated web testing.

```
$ gulp webserver
```

## Publish and Push New Version

First time?

```
$ npm adduser           # Need to do one time
```


1) Verifty package.json version is newer than one in npm (visit https://www.npmjs.com/package/restoff)

2) Verify no pending changes
```
$ git status
```

3)

```
$ npm publish ./
$ git tag -a 0.1.4 -m "v0.1.4"  // 0.1.4 is an example
$ git push origin --tags
```

4) Increment version in package.json and update check-build test. Re-run tests.

## Development Setup

* Install LiveReload Chrome extension.

### Hosts File

Add to your /etc/hosts file:

```
127.0.0.1 test.development.com
```

## Initial install
```
$ npm install
 (NPM install stuff ommitted)
$ mocha tests

  3 passing (or something like this)
```

## Start the test suite
```
$ gulp
  (gulp stuff happens, look for this line...)
  Server started http://test.development.com:4050

```
... then open the test suite in your browser
http://test.development.com:4050

## **RESToff** Angular

**RESToff** is wraped in an [angular provider](http://www.learn-angular.org/#!/lessons/the-provider-recipe).

Example Usage:

```javascript
angular.module("fakeRoot", ["restoff"])
    .config(["restoffProvider", function (restoffProvider) {
        restoffProvider.setConfig({
            rootUri:"http://localhost/"
        });
    }]);
```

When using angular you should add a resourceFilter to remove $$hashKey added by angular if you don't want to keep your
database clean.
Example config for Angular, using the backendless.com backend servivce

```javascript
	var self = restoff.clone({
    rootUri : $common.getENV('backendURL')
		
		,pageHandler : function(resources,uri) {
			if (resources.hasOwnProperty('totalObjects') && resources.hasOwnProperty('data')  && resources.nextPage ) {
				var p =  uri.uriFinal.indexOf('?');
				var ret = (p>0 ? uri.uriFinal.substr(0,p) : uri.uriFinal) + "?" + resources.nextPage.substr( resources.nextPage.indexOf('?')+1) ;
				return ret;
			}
			return false;
		}
		
		,errorHandler : function(error){
			// error = {  message,messageDetail,status,response,uri,restMethod};
			try {
				var resp = JSON.parse(response);
			  if (resp.code==3064) {
				    console.log('Got an invalid user response');
				    self.logout();
			      $rootScope.$broadcast('baas.invaliduser',resp);
			  }
			} catch (ex){}
		}

		,resourceFilter: function(resources,uri){
		   if (resources.hasOwnProperty('totalObjects') && resources.hasOwnProperty('data')) {
					resources=resources.data;
					for (var i=0;i<resources.length;i++) resources[i]=self.plain(resources[i]);
	 		  } else {
				 resources = self.plain(resources);
			 }
			 return resources;
		 }
		,dbService: { 
		 primaryKeyName : "objectId" 
		 ,primaryKeyNotOnPost: true
		 ,dbName: $common.getENV('appName','restoff') +".json"
 		 ,repoOptions: []
		 ,reconSettings: {
			 lastUpdatedFieldName: "updated"
			, softDeleteFieldName: ""
			, softDeleteValue: ""
		 }
			
			,format: {
				deserialize: function(str){
					try {
					 return JSON.parse(CryptoJS.AES.decrypt(str, $rootScope.secretKey || 'undefined').toString(CryptoJS.enc.Utf8));
					} catch (ex) {
						try {return JSON.parse(str);} catch (exx){return {}}
					}
				},
				serialize: function (obj)  {
					return  CryptoJS.AES.encrypt(JSON.stringify(obj),$rootScope.secretKey || 'undefined');
				}
			}
   }
	
    ,onReconciliation: function(completedAction) {
      console.log("The following completed action was reconciled and saved to the server "+ completedAction);
    }
//		,concurrency : 'overwrite'	
//		,persistenceDisabled : true
			
  });
	
self.plain = function (data){
		 if (!data) return data;
		 var obj;
		 try {
			 if (data instanceof Array) {
				 obj =[];
					angular.forEach(data,function(value){
					 this.push(self.plain(value));
					},obj);
			 } else {
				 if (typeof data == "string") {
					 data=JSON.parse(data);
				 }
				 obj = {};
				 angular.forEach(data,function(value,key){
					 if (key.indexOf('__')!=0 &&  key.indexOf('$$hashKey')!=0)  {
						 if (typeof value === 'object') this[key]=self.plain(value);
						 else this[key]=value; 
					 }
				},obj);
			 }
			return obj;
		 } catch (ex) {
			 //console.log("Failed to convert to plain ",JSON.stringify(data),ex.toString());
			 return data;
		 }
	}	
```javascript

Note that we "hard code" the configuration, but you could also get the configuration from another service.

## Development Issues

### Live Reload Isn't Reloading

* In chrome, navigate to ```chrome://extensions/``` then find the LiveReload extension and check Allow access to file URLs.
* Click on livereload icon in chrome browser: small circle in center should become solid.
* Is more than one instance of gulp running?


### Hide HTTP Network Messages During Testing
* In chrome, right mouse click and inspect.
* From the console tab, click on filter (icon next to Top)
* Check "Hide network messages"

[rest-best-practices]: https://codeplanet.io/principles-good-restful-api-design/
[jsonplaceholder-link]: http://jsonplaceholder.typicode.com/
[angular-home-link]: https://angularjs.org/

[database-definition-link]:https://en.wikipedia.org/wiki/Database

[mysql-home-link]: https://www.mysql.com/
[sql-server-home-link]: https://www.microsoft.com/en-us/server-cloud/products/sql-server/features.aspx
[oracle-home-link]: https://www.oracle.com/index.html
[postgress-home-link]: https://www.postgresql.org
[mongodb-home-link]: https://www.mongodb.org/
[redis-home-link]: http://redis.io
