# REST Offline

In development... Not "usable" yet.

Automatically synchronize your local client with backend server data using your existingish RESTful API and make that data available offline. 

Cavets are the results must be Json and you should follow [RESTful bests practices][rest-best-practices].

# Setup

## RestOff Usage

### Functions and Properties

* **forceOffline()** - Force the appliction to operate "offline".
* **forceOnline()** - Force the application back "online".
* **clearCacheBy(repoName)** - Clears the cache of a given repository. Doesn't delete data on the server.
	* TODO: Unless there are pending changes.
* **clearCache()** - Clears all caches. Doesn't delete data on the server.
	* TODO: Unless there are pending changes.
* **get(uri)** - Makes a RESTful call to remote server 
* **autoQueryParam(name, value)** - A parameter of ```name``` with ```value``` will be added/appended to every RESTful api call.
* **autoQueryParamGet(name)** - Returns the value of the query parameter with the provided ```name```.
* **autoHeaderParam(name, value)** - A header of ```name``` with ```value``` will be added to the header of every RESTful api call.
* **autoHeaderParamGet(name)** - Returns the value of the header parameter with the provided ```name```.
* **uriGenerate(uri)** - Returns the uri generated based on things like auto addition of query parameters, etc.

### restoff(config) Settings

config

```
{
	"rootUri" : "http://api.example.com/root/moreroot/",
}
```

##### rootUri Config


restOff uses the rootUri to determine the name of a repository. Let's take ```http://api.example.com/tickets``` as an example end point. The ```rootUri```, by default, will be the protocol + host. The repository name then becomes ```tickets```.

Let's say we have a ```rootUri``` of ```http://api.example.com/root/moreroot/tickets```. The repository name would then be ```root/moreroot/tickets``` which is not optimal.

Let's override the rootUri:

```
{
	"rootUri" : "http://api.example.com/root/moreroot",
}
```

This will lead to our desired repository name of ```tickets```.

### autoQueryParam(name, value)

A parameter of ```name``` with ```value``` will be added/appended to every RESTful api call. Useful for adding parameters such as an access token.

Example usage:

```
var roff = restoff()
	.autoQueryParam("access_token", "rj5aabcea");
```

### autoQueryParamGet(name)

Returns the value of the query parameter with the provided ```name```.

Example usage:

```
var roff = restoff()
	.autoQueryParam("access_token", "rj5aabcea");
var paramVAlue = roff.autoQueryParamGet("access_token");

```


### autoHeaderParam(name, value)

A header of ```name``` with ```value``` will be added to the header of every RESTful api call.  Useful for adding parameters such as an access token.

Example usage:

```
var roff = restoff()
	.autoHeaderParam("access_token", "rj5aabcea");
```

### autoHeaderParamGet(name)

Returns the value of the header parameter with the provided ```name```.

Example usage:

```
var roff = restoff()
	.autoHeaderParam("access_token", "rj5aabcea");
var paramVAlue = roff.autoHeaderParamGet("access_token");

```

### clearCacheBy(repoName)

Clears the cache of the given repository name if the repository exists. Does not a repository named ```repoName``` to the repository if it doesn't exist.

TODO: Unless there are pending changes. Add a "force" parameter.

### clearCacheAll()

Clears the cache of all repositories.

TODO: Unless there are pending changes. add a "force" parameter.


Example usage:

```
var roff = restoff();
// .. do some things
roff.clearCacheAll(); // All cached data is gone
```

### get(uri)

get(uri) makes a call to a RESTful endpoint that returns valid json.

Example usage:

```
var roff = restoff();
return roff.get("http://test.development.com:4050/testsweb/testdata/users")
.then(function(result){
	// use the result here
});

```

### uriGenerate(uri)

restOff may add additional query parameters when restOff.get(uri) is called. Use this method to see the final uri sent to the backend server.

Example usage:

```
var roff = restoff().autoQueryParam("access_token", "rj5aabcea");
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

```
var roff = restoff();
if (roff.isOnline) {
	console.log ("We are online!");
}
```

### isForcedOffline Property, forceOffline() and forceOnline()

You can "force" your application offline by calling ```forceOffline()``` and "force" the application online by calling ```forceOnline()```. Forcing offline overwrites ```ajax.send()``` to simply call ```onreadystatechange``` with a ```readyState``` of ```DONE```.

```isOnline``` will return false when ```isForcedOffline``` is true.

```
var roff = restoff();
roff.forceOffline();
if (!roff.isOnline) {
	console.log ("We are offline!");
}
```

This can be very useful if your customer wants to see how their application behaves when it is offline. For example, a customer could force a reload of all information. Then forceOffline() and see if they have the information they need before going to a location that has no internet access or cellphone access.


## Using In Your Projects

Change directory to your node project.

    $ npm install --save restoff

## Development

### Setup

```
$ npm install
```

### Update Node Module Dependencies

```
$ npm outdated
```

### Node Modules Used

* https://jsonplaceholder.typicode.com/

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
