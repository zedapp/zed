/**
 * File system module that uses Chrome's chooseEntry openDirectory
 * http://developer.chrome.com/apps/fileSystem.html#method-chooseEntry
 * Only supported in Chrome 31+ (currently in Canary)
 */
/*global define, chrome, _ */
define(function(require, exports, module) {
    plugin.consumes = ["history"];
    plugin.provides = ["fs"];
    return plugin;

    function plugin(options, imports, register) {
        var async = require("../lib/async");
        var poll_watcher = require("./poll_watcher");
        var fsUtil = require("./util");

        var history = imports.history;

        var id = options.id;
        var root = options.dir;
        var dontRegister = options.dontRegister;

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

        function mkdirs(path) {
            var parts = path.split("/");
            if (parts.length === 1) {
                return Promise.resolve();
            } else {
                return mkdirs(parts.slice(0, parts.length - 1).join("/")).then(function() {
                    return new Promise(function(resolve, reject) {
                        root.getDirectory(path, {
                            create: true
                        }, function() {
                            resolve();
                        }, reject);
                    });
                });
            }
        }

        var api = {
            listFiles: function() {
                var files = [];

                function readDir(dir, callback) {
                    var reader = dir.createReader();

                    function readDirEntriesUntilEmpty(reader, callback) {
                        function continueCallback() {
                            readDirEntriesUntilEmpty(reader, callback);
                        }

                        reader.readEntries(function(entries) {
                            async.parForEach(entries, function(entry, next) {
                                if (entry.isDirectory) {
                                    readDir(entry, next);
                                } else {
                                    files.push(entry.fullPath);
                                    next();
                                }
                            }, (entries.length === 0) ? callback : continueCallback);
                        });
                    }
                    readDirEntriesUntilEmpty(reader, callback);
                }
                return new Promise(function(resolve, reject) {
                    readDir(root, function(err) {
                        if (err) {
                            return reject(err);
                        }
                        resolve(files.map(stripRoot));
                    });
                });
            },
            readFile: function(path, binary) {
                return new Promise(function(resolve, reject) {
                    root.getFile(addRoot(path), {}, function(f) {
                        var fileReader = new FileReader();
                        fileReader.onload = function(e) {
                            resolve(e.target.result);
                        };
                        f.file(function(file) {
                            if(binary) {
                                fileReader.readAsBinaryString(file);
                            } else {
                                fileReader.readAsText(file);
                            }
                            watcher.setCacheTag(path, "" + file.lastModifiedDate);
                        });
                    }, reject);
                });
            },
            writeFile: function(path, content, binary) {
                return new Promise(function(resolve, reject) {
                    watcher.lockFile(path);
                    var fullPath = addRoot(path);
                    // First ensure parent dir exists
                    return mkdirs(dirname(fullPath)).then(function() {
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
                                                resolve();
                                            });
                                        };
                                        fileWriter.onerror = function(e) {
                                            watcher.unlockFile(path);
                                            reject(e.toString());
                                        };

                                        var blob = binary ? new Blob([fsUtil.binaryStringAsUint8Array(content)]) : new Blob([content]);
                                        fileWriter.write(blob);
                                    }, function(err) {
                                        watcher.unlockFile(path);
                                        reject(err);
                                    });
                                };
                                fileTruncater.truncate(0);
                            });
                        }, function(err) {
                            watcher.unlockFile(path);
                            reject(err);
                        });
                    }, function(err) {
                        watcher.unlockFile(path);
                        throw err;
                    });
                });
            },
            deleteFile: function(path) {
                console.log("Got delete", path);
                return new Promise(function(resolve, reject) {
                    var fullPath = addRoot(path);
                    root.getFile(fullPath, {}, function(fileEntry) {
                        fileEntry.remove(resolve, reject);
                    });
                });
            },
            watchFile: function(path, callback) {
                watcher.watchFile(path, callback);
            },
            unwatchFile: function(path, callback) {
                watcher.unwatchFile(path, callback);
            },
            getCacheTag: function(path) {
                return new Promise(function(resolve, reject) {
                    var fullPath = addRoot(path);
                    root.getFile(fullPath, {}, function(f) {
                        f.file(function(stat) {
                            var tag = "" + stat.lastModifiedDate;
                            resolve(tag);
                        });
                    }, function() {
                        reject(404);
                    });
                });
            },
            getCapabilities: function() {
                return {};
            }
        };

        var watcher = poll_watcher(api, 3000);

        if (!dontRegister) {
            var title = root.fullPath.slice(1);
            history.pushProject(title, "local:" + id);
        }

        register(null, {
            fs: api
        });
    }
});
