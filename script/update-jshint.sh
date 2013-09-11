#!/bin/sh -e

cd `dirname $0`/..
echo "Installing browserify and uglify npm packages"
npm install -g uglify-js browserify
echo "Cloning JSHint"
git clone https://github.com/jshint/jshint.git jshint-temp
cd jshint-temp
npm install
cd src
echo "Browserifying JSHint"
browserify -r jshint -o jshint-all.js jshint.js
echo "Uglifying JSHint"
JSHINTFILE=../../app/plugin/check/jshint.js
echo 'define(function() { var require;' > $JSHINTFILE
uglifyjs jshint-all.js >> $JSHINTFILE
echo 'return require("jshint"); });' >> $JSHINTFILE
cd ../..
rm -rf jshint-temp