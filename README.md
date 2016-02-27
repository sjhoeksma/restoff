# REST Offline

* In development... Not "usable" yet.
* Next major features
	* reconciliation of changes between client and server
	* support getting a sub-set of a collection when offline
	* support non-standard get/put/post.
		- Example: a request GET actually does a delete
	* major cleanup of documentation
	* support put/post updates where resource is changed on the server
		- requires better mockable restapi backend for testing)
	* support nested resources (example: /users/45/addresses)
	* support non-standard restful api: ability to map a user

Automatically synchronize your local client with backend server data using your existingish RESTful API and make that data available offline. 

Cavets are the results must be Json and you should follow [RESTful best known practices][rest-best-practices].

# RestOff Usage

Create a restoff service instance.

```javascript
var rest = restoff();
```

Re-use between calls.

Getting a resource:

```javascript
return rest.get("http://api.example.com/users").then(function(source) {
	console.log(rest.repository["users"]);
});
```

Deleting a resource:

```javascript
return rest.delete("http://api.example.com/users/301378d5").then(function(source) {
	console.log("User deleted");
});
```

Post a resource:

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

```

Put a resource:

```javascript

var roff = restoff({
	"rootUri" : "http://test.development.com:4050/"
});
var existingUser = {
	"id" : "ffa454",
	"first_name": "Happy",
	"last_name": "User"
}

return roff.put("users/ffa454", existingUser).then(function(result){
		// use the result here
	});

```

Example usage of synchronize subsets of resources based on user.

```
var rest = restoff({
	"rootUri" : "http://api.example.com/"
});

function synchronize(rest, userId) {
	rest.get("users/" + userId);
	rest.get("books?ownedby="+userId);
	rest.get("addresses?userid="+userId);
	...
}
```

### Important Notes

* WARNING! When using lowdb, creating two instances of restoff with the same database name results in two different databases being persisted. Be sure to use the same restoff instance throughout your application.

### Functions and Properties

* **autoHeaderParamSet(name, value)** - A header of ```name``` with ```value``` will be added to the header of every RESTful api call.
* **autoHeaderParamGet(name)** - Returns the value of the header parameter with the provided ```name```.
* **autoQueryParamSet(name, value)** - A parameter of ```name``` with ```value``` will be added/appended to every RESTful api call.
* **autoQueryParamGet(name)** - Returns the value of the query parameter with the provided ```name```.
* **clearCacheAll()** - Clears all caches. Doesn't delete data on the server.
* **clearCacheBy(repoName)** - Clears the cache of a given repository. Doesn't delete data on the server.
* **delete(uri)** - Deletes a resource from a remote server.
* **forceOffline()** - Force the appliction to operate "offline".
* **forceOnline()** - Force the application back "online".
* **get(uri)** - Retrieves a json resource from a remote server using the local repository when offline.
* **post(uri, resource)** - Posts a resource to a remote server and in the local repository adding the resource if it doesn't exist or overwriting the existing resource.
* **put(uri, resource)** - Puts a known resource on a remote server and in the local repository updating the resource id provided in the uri.
* **uriGenerate(uri)** - Returns the uri generated based on things like auto addition of query parameters, etc.

### restoff(config) Settings

config

```javascript
{
	"rootUri" : "http://api.example.com/root/moreroot/",
}
```

##### rootUri Config

When making a RESTful call, rootUri will be appended to the beginning of the URI if no protocol is provided.

For example:

```javascript
var roff = restoff(
	{
		"rootUri" : "http://api.example.com/",
	}
)

return roff.get("users") // uri becomes http://api.example.com/users
	.then(function(result){
		// use the result here
	}


return roff.get("http://another.example.com/users") // uri stays http://another.example.com/users
	.then(function(result){
		// use the result here
	}

```

Also, restOff uses the rootUri to determine the name of a repository. Let's take ```http://api.example.com/tickets``` as an example end point. The ```rootUri```, by default, will be the protocol + host. The repository name then becomes ```tickets```.

Let's say we have a ```rootUri``` of ```http://api.example.com/root/moreroot/tickets```. The repository name would then be ```root/moreroot/tickets``` which is not optimal.

Let's override the rootUri:

```javascript
{
	"rootUri" : "http://api.example.com/root/moreroot",
}
```

This will lead to our desired repository name of ```tickets```.

### autoQueryParamSet(name, value)

A parameter of ```name``` with ```value``` will be added/appended to every RESTful api call. Useful for adding parameters such as an access token.

Example usage:

```javascript
var roff = restoff()
	.autoQueryParamSet("access_token", "rj5aabcea");
```

### autoQueryParamGet(name)

Returns the value of the query parameter with the provided ```name```.

Example usage:

```javascript
var roff = restoff()
	.autoQueryParamSet("access_token", "rj5aabcea");
var paramVAlue = roff.autoQueryParamGet("access_token");

```

### autoHeaderParamSet(name, value)

A header of ```name``` with ```value``` will be added to the header of every RESTful api call.  Useful for adding parameters such as an access token.

Example usage:

```javascript
var roff = restoff()
	.autoHeaderParamSet("access_token", "rj5aabcea");
```

### autoHeaderParamGet(name)

Returns the value of the header parameter with the provided ```name```.

Example usage:

```javascript
var roff = restoff()
	.autoHeaderParamSet("access_token", "rj5aabcea");
var paramVAlue = roff.autoHeaderParamGet("access_token");

```

### clearCacheBy(repoName)

Clears the cache of the given repository name if the repository exists. Does not a repository named ```repoName``` to the repository if it doesn't exist.

* TODO: Unless there are pending changes.
	* Add a force parameter to ignore changes?

### clearCacheAll()

Clears the cache of all repositories.

* TODO: Unless there are pending changes.
	* Add a force parameter to ignore changes?

Example usage:

```javascript
var roff = restoff();
// .. do some things
roff.clearCacheAll(); // All cached data is gone
```

### delete(uri)

```delete(uri)``` deletes a resource from a remote server and in the local repository.

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
```

### get(uri)

```get(uri)``` retrieves a json resource from a remote server using the local repository when offline.

Example usage:

```javascript
var roff = restoff();
return roff.get("http://test.development.com:4050/testsweb/testdata/users")
.then(function(result){
	// use the result here
});

```

### post(uri, resource)

```post(uri)``` posts a resource to a remote server and in the local repository adding the resource if it doesn't exist or overwriting the existing resource

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

```

### put(uri, resource)

```put(uri, resource)``` puts a known resource on a remote server and in the local repository updating the resource id provided in the uri.

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

```


### uriGenerate(uri)

restOff may add additional query parameters when restOff.get(uri) is called. Use this method to see the final uri sent to the backend server.

Example usage:

```javascript
var roff = restoff().autoQueryParamSet("access_token", "rj5aabcea");
var actualUri = roff.uriGenerate("http://test.development.com:4050/emailaddresses");
expect(actualUri)).to.equal("http://test.development.com:4050/emailaddresses?access_token=rj5aabcea");

```

### isOnline Property

Determined by the **last** RESTful call.

When true, your application is online. When false, the application is offline. When null, the state is unknown (we haven't yet checked to see if we are online).

Instead of checking for ```true```, ```false``` and ```null``` please use:

* ```restoff.ONLINE_UNKNOWN``` - Resolves to ```null```. State is unknown.
* ```restoff.ONLINE``` - Resolves to ```true```. State is online.
* ```restoff.ONLINE_NOT``` - Resolves to ```false```. State is offline.

Example usage:

```javascript
var roff = restoff();
if (roff.isOnline) {
	console.log ("We are online!");
}
```

### isForcedOffline Property, forceOffline() and forceOnline()

You can "force" your application offline by calling ```forceOffline()``` and "force" the application online by calling ```forceOnline()```. Forcing offline overwrites ```ajax.send()``` to simply call ```onreadystatechange``` with a ```readyState``` of ```DONE```.

```isOnline``` will return false when ```isForcedOffline``` is true.

```javascript
var roff = restoff();
roff.forceOffline();
if (!roff.isOnline) {
	console.log ("We are offline!");
}
```

This can be very useful if your customer wants to see how their application behaves when it is offline. For example, a customer could force a reload of all information. Then forceOffline() and see if they have the information they need before going to a location that has no internet access or cellphone access.


# Setup

## Using In Your Projects

Change directory to your node project.

    $ npm install --save restoff

## Development

### Setup

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

## Publish

```
$ npm adduser           # Need to do one time
$ npm publish ./ 
```


## Development Setup

* Install LiveReload Chrome extension.

### Hosts File

Add to your /etc/hosts file:

```
127.0.0.1 test.development.com
```

## TODOs

* Figure out how to stop 404 (Not Found) message in log. Tried surrounding with try/catch and removing strict.

## Development Issues

### Live Reload Isn't Reloading

* In chrome, navigate to ```chrome://extensions/``` then find the LiveReload extension and check Allow access to file URLs.
* Click on livereload icon in chrome browser: small circle in center should become solid.
* Is more than one instance of gulp running?


[rest-best-practices]: http://www.vinaysahni.com/best-practices-for-a-pragmatic-restful-api
[jsonplaceholder-link]: http://jsonplaceholder.typicode.com/
