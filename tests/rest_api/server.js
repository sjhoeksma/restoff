// var express = require('express');
// var app = express();
// var fs = require('fs');
// var loki = require('lokijs');

// var db = new loki('loki.json');

// var users = db.addCollection('users', { indices: ['id']});
// users.insert(
// );

// app.get('/users', function (req, res) {
// 	// return users.find();

// 	return fs.readFile( __dirname + "/" + "users.json", 'utf8', function (err, data) {
// 		// console.log( data );
// 		res.end( data );
// 	});
// })

// var server = app.listen(8081, function () {

// 	var host = server.address().address
// 	var port = server.address().port

// 	console.log("Example app listening at http://%s:%s", host, port)

// })