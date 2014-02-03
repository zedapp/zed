/**
 * File system module that uses Chrome's chooseEntry openDirectory
 * http://developer.chrome.com/apps/fileSystem.html#method-chooseEntry
 * Only supported in Chrome 31+ (currently in Canary)
 */
/*global define chrome _ */
define(function(require, exports, module) {
    var async = require("../lib/async");
    var poll_watcher = require("./poll_watcher");

    return function(root, callback) {
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
            return filename.substring(root.fullPath.length);
        }

        function addRoot(filename) {
            return root.fullPath + filename;
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
                    root.getDirectory(path, {
                        create: true
                    }, function() {
                        callback();
                    }, callback);
                });
            }
        }

        var fs = {
            listFiles: function(callback) {
                var files = [];

                function readDir(dir, callback) {
                    var reader = dir.createReader();
                    reader.readEntries(function(entries) {
                        async.parForEach(entries, function(entry, next) {
                            if (entry.name[0] === ".") {
                                return next();
                            }
                            if (entry.isDirectory) {
                                readDir(entry, next);
                            } else {
                                files.push(entry.fullPath);
                                next();
                            }
                        }, callback);
                    }, callback);
                }
                readDir(root, function(err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, files.map(stripRoot));
                });
            },
            readFile: function(path, callback) {
                root.getFile(addRoot(path), {}, function(f) {
                    var fileReader = new FileReader();
                    fileReader.onload = function(e) {
                        callback(null, e.target.result);
                    };
                    f.file(function(file) {
                        fileReader.readAsText(file);
                        watcher.setCacheTag(path, "" + file.lastModifiedDate);
                    });
                }, callback);
            },
            writeFile: function(path, content, callback) {
                watcher.lockFile(path);
                var fullPath = addRoot(path);
                // First ensure parent dir exists
                mkdirs(dirname(fullPath), function(err) {
                    if (err) {
                        watcher.unlockFile(path);
                        return callback(err);
                    }
                    root.getFile(fullPath, {
                        create: true
                    }, function(fileEntry) {
                        // For whatever we need to truncate in a separate step
                        // Otherwise we'll end up overwriting the start of the file only.
                        fileEntry.createWriter(function(fileTruncater) {
                            fileTruncater.onwriteend = function() {
                                fileEntry.createWriter(function(fileWriter) {
                                    fileWriter.onwriteend = function() {
                                        fileEntry.file(function(stat) {
                                            watcher.setCacheTag(path, "" + stat.lastModifiedDate);
                                            watcher.unlockFile(path);
                                            callback();
                                        });
                                    };
                                    fileWriter.onerror = function(e) {
                                        watcher.unlockFile(path);
                                        callback(e.toString());
                                    };

                                    var blob = new Blob([content]);
                                    fileWriter.write(blob);
                                }, function(err) {
                                    watcher.unlockFile(path);
                                    callback(err);
                                });
                            };
                            fileTruncater.truncate(0);
                        });
                    }, function(err) {
                        watcher.unlockFile(path);
                        callback(err);
                    });
                });
            },
            deleteFile: function(path, callback) {
                var fullPath = addRoot(path);
                root.getFile(fullPath, {}, function(fileEntry) {
                    fileEntry.remove(function() {
                        callback();
                    }, callback);
                });
            },
            watchFile: function(path, callback) {
                watcher.watchFile(path, callback);
            },
            unwatchFile: function(path, callback) {
                watcher.unwatchFile(path, callback);
            },
            getCacheTag: function(path, callback) {
                var fullPath = addRoot(path);
                root.getFile(fullPath, {}, function(f) {
                    f.file(function(stat) {
                        var tag = "" + stat.lastModifiedDate;
                        callback(null, tag);
                    });
                }, function() {
                    callback(404);
                });
            }
        };

        var watcher = poll_watcher(fs, 3000);
        callback(null, fs);
    };
});