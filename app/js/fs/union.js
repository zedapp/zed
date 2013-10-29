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

    /**
     * @param options:
     *    - watchSelf: emit change events on things written by this fs
     */
    return function(fileSystems, options, callback) {
        var pollInterval = 2000;

        var fileWatchers = {};
        var tagCache = {};

        function hash(content) {
            return content;
        }

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
                attempt("readFile", [path], function(err, content) {
                    if (!err) {
                        tagCache[path] = hash(content);
                    }
                    callback.apply(null, arguments);
                });
            },
            writeFile: function(path, content, callback) {
                if(!options.watchSelf) {
                    tagCache[path] = hash(content);
                }
                attempt("writeFile", [path, content], callback);
            },
            deleteFile: function(path, callback) {
                attempt("deleteFile", [path], callback);
            },
            watchFile: function(path, callback) {
                fileWatchers[path] = fileWatchers[path] || [];
                fileWatchers[path].push(callback);
            },
            unwatchFile: function(path, callback) {
                fileWatchers[path].splice(fileWatchers[path].indexOf(callback), 1);
            }
        };

        function pollFiles() {
            Object.keys(fileWatchers).forEach(function(path) {
                if (fileWatchers[path].length === 0) {
                    return;
                }

                attempt("readFile", [path], function(err, content) {
                    if (err) {
                        // Removed
                        fileWatchers[path].forEach(function(fn) {
                            fn(path, "deleted");
                        });
                        fileWatchers[path] = [];
                    } else {
                        var tag = hash(content);
                        if (tagCache[path] !== tag) {
                            fileWatchers[path].forEach(function(fn) {
                                console.log(path, "changed!");
                                fn(path, "changed");
                            });
                            tagCache[path] = tag;
                        }
                    }
                });
            });
        }

        setInterval(pollFiles, pollInterval);

        callback(null, fs);
    };
});