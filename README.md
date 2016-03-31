# REST Offline

Rest Offline uses your existing RESTful APIs to synchronize client/server data allowing your application to run even when it goes offline.

* Now under MIT license.
* Database agnostic and schema-less.
	* Works against any database backend (SQL, Key/Value, Garph, etc.).
	* Supports multiple databases sources.
	* No need to worry about database schema changes.
	* focus on your RESTful API and not your backend databases
* Supports synchronous RESTful calls (in forcedOffline mode).
    * Simplifies source code.
    * improves client responsiveness.
* Reconciliation and Offline Modes
	* Automatic reconciliation of offline changes.
	* in ```clientOnly``` mode, Restoff automatically provides a complete RESTful offline service for your app.
	* Reconciliation works without soft deletes or last modified date columns in your database
		* Note: reconciliation is much faster with soft delete and laast modified date columns available.
* Supports resources in the following formats:
	* Json
* Works in following frameworks
    * **Standalone** - Restoff can be used without a framework.
    * **[Angular][angular-home-link]** - Restoff wrapped in an Angular 1 provider.
* Limitations and Expectations:
	* Every resource must have one unique ```primaryKey``` field.
	* Best to follow [RESTful best known practices][rest-best-practices]
* Next major features
	* support non-standard get/put/post.
		- Example: a request GET actually does a delete
	* support put/post updates where resource is changed on the server
		- requires better mockable restapi backend for testing)
	* support nested resources (example: /users/45/addresses)
	* support non-standard restful api: ability to map a user

## RestOff Usage

Examples:

```javascript
// Create a restoff service instance.
var roff = restoff({
	rootUri : "http://api.example.com/" // Required Option
});

roff.get("users").then(function(user) {
	console.log(rest.dbRepo.read("users")); // Access repository directly
});

roff.delete("users/301378d5").then(function(deletedUserId) {
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

## Restoff Options

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

* Effectivly bypass the core feature of Restoff causing it to act like a standard http library.
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

```onCallPending``` is the function called by Restoff before a pending call is executed. Provided is all information about the pending action and the uri record.

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

* Restoff requires every repository to have a single primary key
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

* In ```forcedOffline``` mode, Restoff will store any put/post/delete actions in the ```pending``` repository.
* In ```clientOnly``` mode, Retsoff will **not** store any put/post/delete actions in the ```pending``` repository.

### generateId [Optional]

```generateId``` is the function called by Restoff to generate a primary key. Bey default, restOff uses ```RestOff.prototype._guidGenerate()``` but you can define your own.

```javascript
var rest = restoff({
	rootUri: "http://api.example.com/",
	generateId: function() { return Math.floor((1 + Math.random()) * 0x10000); } // not a great unique key generator
});
```

### onReconciliation(completedAction) [Optional]

```onReconciliation``` is the function called by Restoff after reconciliation of a given resource is complete.

```javascript
var rest = restoff({
	rootUri: "http://api.example.com/",
	onReconciliation: function(completedAction) {
	  console.log("The following completed action was reconciled and saved to the server %O.", completedAction);
	}
});
```

Note: Placed features will provide a more robust reconciliation process allowing the developer to provide their own custom reconciliation process. Currently, Restoff always applies Brent Reconciliation.

### pendingUri and pendingRepoName

When offline, Restoff places any put/post/delete RESTful operations in a ```pending``` repository. Restoff uses it's own persistence engine meaning it calls itself using get/post/delete.

Use ```pendingUri``` and ```pendingRepoName``` to configure the URI and repository name of the ```pending``` repository.

* Note: In ```clientOnly``` mode, no changes are recorded in the ```pending``` repository.

## Restoff Methods

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



### delete(uri, [options]), deleteSync(uri, [options])

* ```delete(uri, [options])``` asynchronously deletes a resource from a remote server and in the local repository.
* ```deleteSync(uri, [options])``` synchronously deletes a resource from a remote server and in the local repository (only works in forcedOffline mode).

Note:

* A 404 (not found) is "ignored" and the resource is still removed from the local repository.
* If delete(uri) is called on a non-existent repository, an empty repository is created.
* TODO: When offline, delete will occur in the local repository and synchronize when the client/server is back online.

Example usage:

```javascript
var roff = restoff();
return roff.delete("http://test.development.com:4050/users/553fdf")
.then(function(result){
	// user was deleted
});

roff.forcedOffline = true;
var result = roff.deleteSync("http://test.development.com:4050/users/553fdf");
```

### get(uri, [options]), getSync(uri, [options])

* ```get(uri, [options])``` asynchronously retrieves a json resource from a remote server. Uses the local repository when offline.
* ```getSync(uri, [options])``` synchronously retrieves a json resource from the local repository (only works in forcedOffline mode).


Example usage:

```javascript
var roff = restoff();
return roff.get("http://test.development.com:4050/testsweb/testdata/users")
.then(function(result){
	// use the result here
});

roff.forcedOffline = true;
var result = roff.getSync("http://test.development.com:4050/testsweb/testdata/users");


```

### post(uri, resource, [options]), postSync(uri, resource, [options])

* ```post(uri, resource, [options])``` asynchronously posts a resource to a remote server and in the local repository adding the resource if it doesn't exist or overwriting the existing resource.
* ```postSync(uri, resource, [options])``` synchronously posts a resource in the local repository adding the resource if it doesn't exist or overwriting the existing resource (only works in forcedOffline mode).


* When online, inserts and updates will happen immediately.
* TODO: May want to do a POST then a GET to catch any changes by a model on the server before the data is posted???
* TODO: When offline, inserts and updates will happen in the local repository and synchronzie when the client/server is back online.

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
var result = roff.postSync("http://test.development.com:4050/users", newUser)

```

### put(uri, resource, [options]), putSync(uri, resource, [options])

* ```put(uri, resource, [options])``` asynchronously puts a known resource on a remote server and in the local repository updating the resource id provided in the uri.
* ```put(uri, resource, [options])``` synchronously puts a known resource in the local repository updating the resource id provided in the uri (only works in forcedOffline mode).

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

return roff.post("users/ffa454", existingUser)
.then(function(result){
	// use the result here
});

roff.forcedOffline = true;
var result = roff.postSync("users/ffa454", existingUser)

```

### uriFromClient(uri)

restOff may add additional query parameters when restOff.get(uri) is called. Use this method to see the final uri sent to the backend server.

Example usage:

```javascript
var roff = restoff().autoQueryParamSet("access_token", "rj5aabcea");
var actualUri = roff.uriFromClient("http://test.development.com:4050/emailaddresses");
expect(actualUri)).to.equal("http://test.development.com:4050/emailaddresses?access_token=rj5aabcea");
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

## Restoff Angular

Restoff is wraped in an [angular provider](http://www.learn-angular.org/#!/lessons/the-provider-recipe).

Example Usage:

```javascript
angular.module("fakeRoot", ["restoff"])
    .config(["restoffProvider", function (restoffProvider) {
        restoffProvider.setConfig({
            rootUri:"http://localhost/"
        });
    }]);
```

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
