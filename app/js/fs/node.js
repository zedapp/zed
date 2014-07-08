/*global define, _, nodeRequire */
define(function(require, exports, module) {
    plugin.consumes = ["history"]
    plugin.provides = ["fs"];
    return plugin;

    function plugin(options, imports, register) {
        var async = require("../lib/async");
        var poll_watcher = require("./poll_watcher");
        var nodeFs = nodeRequire("fs");
        var path = nodeRequire("path");

        var history = imports.history;

        var rootPath = options.dir;
        var dontRegister = options.dontRegister;

        // Support opening a single file
        var stats = nodeFs.statSync(rootPath);
        var filename;
        if(stats.isFile()) {
            filename = path.basename(rootPath);
            rootPath = path.dirname(rootPath);
        }

        // Copy and paste from project.js, but cannot important that due to
        // recursive imports.
        function dirname(path) {
            if (path[path.length - 1] === '/') {
                path = path.substring(0, path.length - 1);
            }
            var parts = path.split("/");
            return parts.slice(0, parts.length - 1).join("/");
        }

        function stripRoot(filename) {
            return filename.substring(rootPath.length);
        }

        function addRoot(filename) {
            return rootPath + filename;
        }

        function mkdirs(path, callback) {
            var parts = path.split("/");
            if (parts.length === 1) {
                callback();
            } else {
                mkdirs(parts.slice(0, parts.length - 1).join("/"), function(err) {
                    if (err) {
                        return callback(err);
                    }
                    nodeFs.exists(path, function(exists) {
                        if (exists) {
                            callback();
                        } else {
                            nodeFs.mkdir(path, callback);
                        }
                    });
                });
            }
        }

        var api = {
            listFiles: function(callback) {
                var files = [];

                function readDir(dir, callback) {
                    nodeFs.readdir(dir, function(err, entries) {
                        if (err) {
                            return callback(err);
                        }
                        async.parForEach(entries, function(entry, next) {
                            // if (entry[0] === ".") {
                            //     return next();
                            // }
                            var fullPath = dir + "/" + entry;
                            nodeFs.stat(fullPath, function(err, stat) {
                                if (err) {
                                    return next(err);
                                }
                                if (stat.isDirectory()) {
                                    readDir(fullPath, next);
                                } else {
                                    files.push(fullPath);
                                    next();
                                }
                            });
                        }, callback);
                    });
                }
                readDir(rootPath, function(err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, files.map(stripRoot));
                });
            },
            readFile: function(path, callback) {
                if (path === "/.zedstate" && filename) {
                    return callback(null, JSON.stringify({
                        "session.current": ["/" + filename]
                    }));
                }
                var fullPath = addRoot(path);
                nodeFs.readFile(fullPath, {
                    encoding: 'utf8'
                }, function(err, contents) {
                    if (err) {
                        return callback(err);
                    }
                    nodeFs.stat(fullPath, function(err, stat) {
                        if (err) {
                            console.error("Readfile successful, but error during stat:", err);
                        }
                        watcher.setCacheTag(path, "" + stat.mtime);
                        callback(null, contents);
                    });
                });
            },
            writeFile: function(path, content, callback) {
                if (path === "/.zedstate" && filename) {
                    return callback();
                }
                var fullPath = addRoot(path);
                // First ensure parent dir exists
                mkdirs(dirname(fullPath), function(err) {
                    if (err) {
                        return callback(err);
                    }
                    nodeFs.writeFile(fullPath, content, function(err) {
                        if (err) {
                            return callback(err);
                        }
                        nodeFs.stat(fullPath, function(err, stat) {
                            watcher.setCacheTag(path, "" + stat.mtime);
                            callback();
                        });
                    });
                });
            },
            deleteFile: function(path, callback) {
                var fullPath = addRoot(path);
                nodeFs.unlink(fullPath, callback);
            },
            watchFile: function(path, callback) {
                watcher.watchFile(path, callback);
            },
            unwatchFile: function(path, callback) {
                watcher.unwatchFile(path, callback);
            },
            getCacheTag: function(path, callback) {
                nodeFs.stat(addRoot(path), function(err, stat) {
                    if (err) {
                        return callback(404);
                    }
                    callback(null, "" + stat.mtime);
                });
            }
        };

        var watcher = poll_watcher(api, 3000);
        if (!dontRegister) {
            history.pushProject(options.dir, "node:" + options.dir);
        }
        register(null, {
            fs: api
        });
    }
});
