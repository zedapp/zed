/**
 * This module implements a union fs, it will do fall-through for various operations
 * such as reads and writes, attempting them one by one until one succeeds.
 * 
 * Note: currently unionfs overrides file watching behavior and does manual
 *       watching based on content.
 */
/* global _ */
define(function(require, exports, module) {
    var async = require("../lib/async");
    var poll_watcher = require("./poll_watcher");

    /**
     * @param options:
     *    - watchSelf: emit change events on things written by this fs
     */
    return function(fileSystems, options, callback) {
        function attempt(fnName, args, callback) {
            var index = 0;

            function attemptOne() {
                fileSystems[index][fnName].apply(fileSystems[index], args.concat([function(err) {
                    if (err) {
                        index++;
                        if (index >= fileSystems.length) {
                            return callback(err);
                        } else {
                            return attemptOne();
                        }
                    }
                    callback.apply(null, arguments);
                }]));
            }
            attemptOne();
        }


        var fs = {
            listFiles: function(callback) {
                var files = [];
                async.parForEach(fileSystems, function(fs, next) {
                    fs.listFiles(function(err, files_) {
                        if (err) {
                            console.error("Got error from filesystem", fs, err);
                            return next();
                        }
                        files_.forEach(function(filename) {
                            if(files.indexOf(filename) === -1) {
                                files.push(filename);
                            }
                        });
                        next();
                    });
                }, function() {
                    callback(null, files);
                });
            },
            readFile: function(path, callback) {
                attempt("readFile", [path], function(err) {
                    if (!err) {
                        fs.getCacheTag(path, function(err, tag) {
                            if(err) {
                                return console.error("Could not get tag for", path, "this shouldn't happen.");
                            }
                            watcher.setCacheTag(path, tag);
                        });
                    }
                    callback.apply(null, arguments);
                });
            },
            writeFile: function(path, content, callback) {
                attempt("writeFile", [path, content], function(err) {
                    if(!err && !options.watchSelf) {
                        fs.getCacheTag(path, function(err, tag) {
                            if(err) {
                                return console.error("Could not get tag for", path, "this shouldn't happen.");
                            }
                            watcher.setCacheTag(path, tag);
                        });
                    }
                    callback.apply(null, arguments);
                });
            },
            deleteFile: function(path, callback) {
                attempt("deleteFile", [path], callback);
            },
            watchFile: function(path, callback) {
                watcher.watchFile(path, callback);
            },
            unwatchFile: function(path, callback) {
                watcher.unwatchFile(path, callback);
            },
            getCacheTag: function(path, callback) {
                attempt("getCacheTag", [path], callback);
            }
        };
        
        var watcher = poll_watcher(fs, 2000);

        callback(null, fs);
    };
});