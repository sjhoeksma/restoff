# REST Offline

Automatically synchronize your local client with backend server data using your existingish RESTful API and make that data available offline. 

Cavets are the results must be Json and you should follow [RESTful bests practices][rest-best-practices].

# Setup

## RestOff Usage

### restoff(config) Settings

config

```
{
	"rootUri" : "/will/remove",
}
```

#### rootUri Config

By deafult, ```rootUri``` is the empty string. Used to remove any location information within your uri that is not actually part of the RESTful api.

For example, if your restful endpoint is ```http://api.example.com/root/moreroot/tickets``` then the root Uri would be set as follows:

```
{
	"rootUri" : "/root/moreroot",
}
```

leaving you with a repoistory name of ```tickets```. Without the rootUri, your repository name becomes ```root/moreroot/tickets```.

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

### isOnline Property

Determined by the **last** RESTful call.

When true, your application is online. When false, the application is offline.

Example usage:

```
var roff = restoff();
if (roff.isOnline) {
	console.log ("We are online!");
}
```

### isForcedOffline and forceOffline Properties

You can "force" your application offline by setting ```forceOffline = false```. Forcing offline overwrites ```ajax.send()``` to simply call ```onreadystatechange``` with a ```readyState``` of ```DONE```.

```isOnline``` will return false when ```isForcedOffline``` is true.

```
var roff = restoff();
roff.forceOffline = true;
if (!roff.isOnline) {
	console.log ("We are offline!");
}
```

This can be very useful if your customer wants to see how their application behaves when it is offline. For example, a customer could force a reload of all information. Then forceOffline and see if they have the information they need before going to a location that has no internet access or cellphone access.


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


## Development Issues

### Live Reload Isn't Reloading

* In chrome, navigate to ```chrome://extensions/``` then find the LiveReload extension and check Allow access to file URLs.
* Click on livereload icon in chrome browser: small circle in center should become solid.
* Is more than one instance of gulp running?


[rest-best-practices]: http://www.vinaysahni.com/best-practices-for-a-pragmatic-restful-api
