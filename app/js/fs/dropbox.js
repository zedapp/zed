/*global define, Dropbox, chrome */
define(function(require, exports, module) {
    plugin.consumes = ["history"];
    plugin.provides = ["fs"];
    return plugin;

    function plugin(options, imports, register) {
        var dropbox = require("lib/dropbox");
        var poll_watcher = require("./poll_watcher");
        var async = require("../lib/async");
        var rootPath = options.rootPath;

        var history = imports.history;

        rootPath = rootPath || "/";
        if (rootPath[0] !== "/") {
            rootPath = "/" + rootPath;
        }

        dropbox.authenticate(function(err, dropbox) {
            if (err) {
                return register(err);
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

            function mkdirs(path) {
                var parts = path.split("/");
                if (parts.length === 1) {
                    return Promise.resolve();
                } else {
                    return mkdirs(parts.slice(0, parts.length - 1).join("/")).then(function() {
                        return new Promise(function(resolve, reject) {
                            dropbox.stat(path, function(err, result) {
                                if (err || result.isRemoved) {
                                    dropbox.mkdir(path, function(err) {
                                        if (err) {
                                            return reject(err);
                                        }
                                        resolve();
                                    });
                                } else {
                                    resolve();
                                }
                            });
                        });
                    });
                }
            }

            function listFiles() {
                var files = [];
                return new Promise(function(resolve, reject) {
                    function readDir(dir, callback) {
                        dropbox.readdir(dir, function(err, stringEntries, dirStat, entries) {
                            if (err) {
                                return callback(err);
                            }
                            async.parForEach(entries, function(entry, next) {
                                // if (entry.name[0] === ".") {
                                //     return next();
                                // }
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
                            return reject(err);
                        }
                        resolve(files.map(stripRoot));
                    });
                });

            }

            function readFile(path) {
                var fullPath = addRoot(path);
                return new Promise(function(resolve, reject) {
                    dropbox.readFile(fullPath, function(err, content, stat) {
                        if (err) {
                            return reject(err);
                        }
                        watcher.setCacheTag(path, stat.versionTag);
                        resolve(content);
                    });
                });
            }

            function writeFile(path, content, callback) {
                watcher.lockFile(path);
                var fullPath = addRoot(path);

                function doWrite() {
                    return new Promise(function(resolve, reject) {
                        dropbox.writeFile(fullPath, content, function(err, stat) {
                            if (err) {
                                watcher.unlockFile(path);
                                return reject(err);
                            }
                            watcher.setCacheTag(path, stat.versionTag);
                            watcher.unlockFile(path);
                            resolve();
                        });
                    });
                }

                return doWrite().then(function() {
                    watcher.unlockFile(path);
                }, function(err) {
                    // Presumably directory did not yet exist
                    return mkdirs(dirname(fullPath)).then(doWrite);
                }).
                catch (function(err) {
                    watcher.unlockFile(path);
                });
            }

            function deleteFile(path, callback) {
                var fullPath = addRoot(path);
                return new Promise(function(resolve, reject) {
                    dropbox.remove(fullPath, function(err) {
                        if(err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            }

            function getCacheTag(path, callback) {
                var fullPath = addRoot(path);
                return new Promise(function(resolve, reject) {
                    dropbox.stat(fullPath, function(err, stat) {
                        if (err) {
                            return reject(err);
                        }
                        if (stat.isRemoved) {
                            return reject(404);
                        } else {
                            resolve(stat.versionTag);
                        }
                    });
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
                getCacheTag: getCacheTag,
                getCapabilities: function() {
                    return {};
                }
            };

            var watcher = poll_watcher(fs, 10000);

            history.pushProject(rootPath.slice(1), "dropbox:" + rootPath);

            register(null, {
                fs: fs
            });
        });
    }
});
