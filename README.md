# REST Offline

Automatically synchronize your local client with backend server data using your existingish RESTful API and make that data available offline. 

Cavets are the results must be Json and you should follow [RESTful bests practices][rest-best-practices].

# Setup

## Using In Your Projects

Change directory to your node project.

    $ npm install --save restoff

## Development

### Setup

```
$ npm install
```

### Usage

#### get(uri)

get(uri) makes a call to a RESTful endpoint that returns valid json.

Example usage:

```
return roff.get("http://test.development.com:4050/testsweb/testdata/user01.json")
.then(function(result){
	// use the result here
});

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
