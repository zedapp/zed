/**
 * File system module that uses Chrome's chooseEntry openDirectory
 * http://developer.chrome.com/apps/fileSystem.html#method-chooseEntry
 * Only supported in Chrome 31+ (currently in Canary)
 */
/*global define chrome _ */
define(function(require, exports, module) {
    var async = require("../lib/async");

    return function(root) {
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
                    if(err) {
                        return callback(err);
                    }
                    root.getDirectory(path, {create: true}, function() {
                        callback();
                    }, callback);
                });
            }
        }

        return {
            listFiles: function(callback) {
                var files = [];

                function readDir(dir, callback) {
                    var reader = dir.createReader();
                    reader.readEntries(function(entries) {
                        async.forEach(entries, function(entry, next) {
                            if(entry.name[0] === ".") {
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
                    });
                }, callback);
            },
            writeFile: function(path, content, callback) {
                var fullPath = addRoot(path);
                // First ensure parent dir exists
                mkdirs(dirname(fullPath), function(err) {
                    if(err) {
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
                                        callback();
                                    };
                                    fileWriter.onerror = function(e) {
                                        callback(e.toString());
                                    };

                                    var blob = new Blob([content]);
                                    fileWriter.write(blob);
                                }, callback);
                            };
                            fileTruncater.truncate(0);
                        });
                    }, callback);
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
            getUrl: function(path, callback) {
                var fullPath = addRoot(path);
                root.getFile(fullPath, {}, function(fileEntry) {
                    callback(null, fileEntry.toURL());
                });
            },
            watchFile: function() {
                // TODO
            },
            unwatchFile: function() {
                // TODO
            }
        };
    };
});