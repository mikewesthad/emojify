"use strict";

// _____________________________________________________________________________
// SETUP
// Bring in the required node modules to make everything run smoothly

// Gulp & gulp plugins
var gulp = require("gulp");
var sass = require("gulp-sass");
var open = require("gulp-open");
var concat = require("gulp-concat");
var autoprefixer = require("gulp-autoprefixer");
var sourcemaps = require("gulp-sourcemaps");
var liveReload = require("gulp-livereload");
var uglify = require("gulp-uglify");
var newer = require("gulp-newer");
var ghPages = require("gulp-gh-pages");
var gutil = require("gulp-util");
var jshint = require("gulp-jshint"); // Requires npm jshint
var stylish = require("jshint-stylish");
var browserify = require("browserify");
var source = require("vinyl-source-stream");
var buffer = require("vinyl-buffer");
var del = require("del");
var express = require("express");
var path = require("path");
var fs = require("fs");
var runSequence = require("run-sequence");
var gulpif = require("gulp-if");

// Check the command line to see if this is a production build
var isProduction = (gutil.env.p || gutil.env.production);
console.log("Build environment: " + (isProduction ? "production" : "debug"));

// _____________________________________________________________________________
// BUILD TASKS
// These gulp tasks take everything that is in src/, process them (e.g. turn
// SASS into css) and output them into build/.

// Take any HTML and in src/ and copy it over to build/
// Pipe the changes to LiveReload, so that saving a file triggers the site to 
// reload in the browser.
gulp.task("copy-html", function () {
    return gulp.src("src/**/*.html")
        .pipe(gulp.dest("build/"))
        .pipe(liveReload());
});

// Turn the SASS in src/ into css in build/.  This task autoprefixes the SASS 
// with CSS vendor prefixes.  It also adds sourcemaps, making debugging with 
// inspector much easier.
gulp.task("sass", function () {
    // Configure a sass stream so that it logs errors properly
    var sassStream = sass({outputStyle: "compressed"});
    sassStream.on("error", sass.logError);
    // Convert SASS
    return gulp.src("src/sass/**/*.scss")
        .pipe(sourcemaps.init())
            .pipe(sassStream)
            .pipe(autoprefixer({
                browsers: [
                    // Add vendor prefixes to match bootstrap:
                    // https://github.com/twbs/bootstrap-sass#sass-autoprefixer
                    "Android 2.3",
                    "Android >= 4",
                    "Chrome >= 20",
                    "Firefox >= 24",
                    "Explorer >= 8",
                    "iOS >= 6",
                    "Opera >= 12",
                    "Safari >= 6"
                ],
                cascade: true
            }))
        .pipe(sourcemaps.write("maps"))
        .pipe(gulp.dest("build"))
        .pipe(liveReload());
});

// Combine, sourcemap and uglify vendor libraries (e.g. bootstrap, jquery, etc.)
// into build/js/libs.js folder.
gulp.task("js-libs", function() {
    return gulp.src("src/js/libs/**/*.js")
        .pipe(sourcemaps.init())
            .pipe(concat("libs.js"))
            .pipe(gulpif(isProduction, uglify()))
        .pipe(sourcemaps.write("libs-maps"))
        .pipe(gulp.dest("build/js"))
        .pipe(liveReload());
});

gulp.task("js", function() {
    var b = browserify({
        entries: "src/js/emojify.js",
        debug: true
    })
    return b.bundle()
        .on("error", gutil.log)
        .pipe(source("emojify.js"))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
            .pipe(gulpif(isProduction, uglify()))
            .on("error", gutil.log)
        .pipe(sourcemaps.write("emojify"))
        .pipe(gulp.dest("build/js"))
        .pipe(liveReload());
});

gulp.task("jslint", function() {
    return gulp.src(["src/js/**.js", "!src/js/libs/**/*.js"])
        .pipe(jshint())
        .pipe(jshint.reporter(stylish));
});

// Take any (new) images from src/images over to build/images.
gulp.task("images", function () {
    return gulp.src("src/images/**/*.*")
        .pipe(newer("build/images"))
        .pipe(gulp.dest("build/images"));
});

// Take any (new) models from src/models over to build/models.
gulp.task("models", function () {
    return gulp.src("src/models/**/*.*")
        .pipe(newer("build/models"))
        .pipe(gulp.dest("build/models"));
});

// The build task will run all the individual build-related tasks above.
gulp.task("build", [
    "copy-html",
    "sass",
    "jslint",
    "js-libs",
    "js",
    "models",
    "images"
]);


// _____________________________________________________________________________
// RUNNING TASKS
// These gulp tasks handle everything related to running the site.  Starting a
// local server, watching for changes to files, opening a browser, etc.

// Watch for changes to any files (e.g. saving a file) and then trigger the 
// appropraite build task.  This task also starts a LiveReload server that can
// tell the browser to refresh the page automatically when changes are made.
gulp.task("watch", function () {
    liveReload.listen(); // Start the LiveReload server
    gulp.watch("src/**/*.html", ["copy-html"]);
    // gulp.watch("src/js/libs/**/*.js", ["js-libs"]);
    gulp.watch(["src/js/**/*.js", "!src/js/libs/**/*.js"], ["jslint", "js"]);
    gulp.watch("src/sass/**/*.{scss,sass,css}", ["sass"]);
    // gulp.watch("src/images/**/*.*", ["images"]);
});

// Start an express server that serves everything in build/ to localhost:8080/.
gulp.task("express-server", function () {
    var app = express();
    app.use(express.static(path.join(__dirname, "build")));
    app.listen(8080);
});

// Automatically open localhost:8080/ in the browser using whatever the default
// browser.
gulp.task("open", function() {
    return gulp.src(__filename)
        .pipe(open({uri: "http://127.0.0.1:8080"}));
});

// The build task will run all the individual run-related tasks above.
gulp.task("run", [
    "express-server",
    "open",
    "watch"
]);


// _____________________________________________________________________________
// CLEANING TASKS
// These gulp tasks handle deleting files.

// Delete all of the build folder contents.
gulp.task("clean:build", function () {
    return del(["./build/**/*"]);
});

// Delete all of the build folder contents.
gulp.task("clean:publish", function () {
    return del(["./publish/**/*"]);
});


// _____________________________________________________________________________
// DEPLOYING TASKS
// These gulp tasks handle everything related to deploying the site to live
// server(s).

gulp.task("push:gh-pages", function () {
    return gulp.src("./build/**/*")
        .pipe(ghPages({
            remoteUrl: "https://github.com/mikewesthad/emojify.git"
        }));
});

// Build, deploy build/ folder to gh-pages and then clean up
gulp.task("deploy:gh-pages", function () {
    return runSequence("build", "push:gh-pages", "clean:publish");
});


// _____________________________________________________________________________
// DEFAULT TASK
// This gulp task runs automatically when you don't specify task.

// Build and then run it.
gulp.task("default", function (callback) {
    runSequence("build", "run", callback);
});