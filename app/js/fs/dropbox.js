/*global define, Dropbox, chrome */
define(function(require, exports, module) {
    var dropbox = require("lib/dropbox");
    var poll_watcher = require("./poll_watcher");
    var async = require("../lib/async");

    return function(rootPath, callback) {
        // Normalize
        rootPath = rootPath || "/";
        if (rootPath[0] !== "/") {
            rootPath = "/" + rootPath;
        }

        dropbox.authenticate(function(err, dropbox) {
            if (err) {
                return callback(err);
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
                        dropbox.stat(path, function(err, result) {
                            if (err || result.isRemoved) {
                                dropbox.mkdir(path, callback);
                            } else {
                                callback();
                            }
                        });
                    });
                }
            }

            function listFiles(callback) {
                var files = [];

                function readDir(dir, callback) {
                    dropbox.readdir(dir, function(err, stringEntries, dirStat, entries) {
                        if (err) {
                            return callback(err);
                        }
                        async.parForEach(entries, function(entry, next) {
                            if (entry.name[0] === ".") {
                                return next();
                            }
                            if (entry.isFolder) {
                                readDir(entry.path, next);
                            } else {
                                files.push(entry.path);
                                next();
                            }
                        }, callback);
                    });
                }
                readDir(rootPath, function(err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, files.map(stripRoot));
                });
            }

            function readFile(path, callback) {
                var fullPath = addRoot(path);
                dropbox.readFile(fullPath, function(err, content, stat) {
                    if (err) {
                        return callback(err);
                    }
                    watcher.setCacheTag(path, stat.versionTag);
                    callback(null, content);
                });
            }

            function writeFile(path, content, callback) {
                
                watcher.lockFile(path);
                var fullPath = addRoot(path);

                function doWrite(callback) {
                    dropbox.writeFile(fullPath, content, function(err, stat) {
                        if (err) {
                            watcher.unlockFile(path);
                            return callback(err);
                        }
                        watcher.setCacheTag(stat.versionTag);
                        watcher.unlockFile(path);
                        callback();
                    });
                }

                doWrite(function(err) {
                    if (err) {
                        // Presumably directory did not yet exist
                        mkdirs(dirname(fullPath), function(err) {
                            if (err) {
                                watcher.unlockFile(path);
                                return callback(err);
                            }
                            doWrite(callback);
                        });
                    }
                    watcher.unlockFile(path);
                    callback();
                });
            }

            function deleteFile(path, callback) {
                var fullPath = addRoot(path);
                dropbox.remove(fullPath, callback);
            }

            function getCacheTag(path, callback) {
                var fullPath = addRoot(path);
                dropbox.stat(fullPath, function(err, stat) {
                    if (err) {
                        return callback(err);
                    }
                    if (stat.isRemoved) {
                        return callback(404);
                    } else {
                        callback(null, stat.versionTag);
                    }
                });
            }

            var fs = {
                listFiles: listFiles,
                readFile: readFile,
                writeFile: writeFile,
                deleteFile: deleteFile,
                watchFile: function(path, callback) {
                    watcher.watchFile(path, callback);
                },
                unwatchFile: function(path, callback) {
                    watcher.unwatchFile(path, callback);
                },
                getCacheTag: getCacheTag
            };
            
            var watcher = poll_watcher(fs, 10000);
            
            callback(null, fs);
        });
    };
});