'use strict';

var pkg = require('./package.json'); // Changed this? Need to re-run gulp to reload the
var gulp = require('gulp');
var gutil = require('gulp-util');
var header = require('gulp-header');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var replace = require('gulp-replace');
var rename = require('gulp-rename');
var mocha = require('gulp-mocha');
var mochaPhantom = require('gulp-mocha-phantomjs');
var connect = require('gulp-connect');
var livereload = require('gulp-livereload');
var exec = require('child_process').exec;

var source = pkg.source;
var libName = pkg.name;
var libFileName = pkg.name + '.js';
var libSubName = pkg.namesub;
var libMain = pkg.main;

var banner = function(bundled) {
	return [
		'// ' + libFileName,
		'// version: ' + pkg.version,
		'// author: ' + pkg.author,
		'// license: ' + pkg.license
	].join('\n') + '\n';
};

gulp.task('default', ['build', 'mocha', 'watch', 'webserver', 'restserver']);

gulp.task('mocha', ['build'], function() {
	return gulp.src(['tests/*test.js'], {
			read: false
		})
		.pipe(mocha({
			reporter: 'spec'
		}))
		.on('error', gutil.log);
});

gulp.task('watch', function() {
	livereload.listen();
	return gulp.watch(['src/**', 'tests/**', 'testsweb/**', 'index.html'], ['mocha']);
});

gulp.task('build', function() {
	return gulp.src(source) // list of .js files we will concat
		.pipe(concat(libFileName)) // concat into pkg.name + '.js'
		.pipe(header(banner())) // add header (your name, etc.)
		.pipe(replace('{{VERSION}}', // update version tag in code
			pkg.version))
		.pipe(replace('{{NAMESUB}}', // update namesub tag in code
			libSubName))
		.pipe(gulp.dest('dist')) // dump pkg.name + '.js'
		.pipe(rename(libName + '.min.js')) // rename for minify
		.pipe(uglify()) // minify it
		.pipe(gulp.dest('dist')) // dump pkg.name + '.min.js'
		.pipe(livereload())
		.on('error', gutil.log); // log any errors
});

gulp.task('webtests', ['build'], function() {
	console.log("Running webtests")
	return gulp.src('testsweb/index.html')
		.pipe(mochaPhantom({
			reporter: 'spec'
		}));
		
});

// edit /etc/hosts and add 127.0.0.1 test.development.com
// NOTE: Must run under sudo if trying to open port 80 (port less than 1000)
// http://code.tutsplus.com/tutorials/gulp-as-a-development-web-server--cms-20903
// https://github.com/AveVlad/gulp-connect
gulp.task('webserver', function() {
	connect.server({
		port: 4050,
		host: 'test.development.com',
	});
});

gulp.task('restserver', function (cb) {
	console.log("Running test rest api server on port 3000.");
	console.log("Try going to http://test.development.com:3000/users");

	exec('json-server database/db.json', function (err, stdout, stderr) {
    	console.log(stdout);
    	console.log(stderr);
    	cb(err);
	});
});

gulp.task('restserverkill', function (cb) {
	console.log("Killing rest api server on port 3000.");

	exec("lsof -i tcp:3000 | awk 'NR!=1 {print $2}'", function (err, stdout, stderr) {
	// exec("lsof -i tcp:3000 | awk 'NR!=1 {print $2}' | xargs kill", function (err, stdout, stderr) {
    	console.log(stdout);
    	console.log(stderr);
    	cb(err);
	});
});





