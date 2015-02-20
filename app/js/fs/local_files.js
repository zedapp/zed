define(function(require, exports, module) {
    plugin.provides = ["fs"];
    return plugin;

    function plugin(options, imports, register) {
        var poll_watcher = require("./poll_watcher");
        var fsUtil = require("./util");

        var fileEntries = {};

        _.each(options.entries, function(fileEntry) {
            fileEntries[fileEntry.fullPath] = fileEntry;
        });

        var api = {
            listFiles: function() {
                return Promise.resolve(Object.keys(fileEntries));
            },
            readFile: function(path, binary) {
                if (path === "/.zedstate") {
                    return Promise.resolve(JSON.stringify({
                        "session.current": [options.entries[0].fullPath]
                    }));
                }
                return new Promise(function(resolve, reject) {
                    var f = fileEntries[path];
                    if(!f) {
                        return reject(404);
                    }
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
                });
            },
            writeFile: function(path, content, binary) {
                if(path === "/.zedstate") {
                    return Promise.resolve();
                }
                return new Promise(function(resolve, reject) {
                    watcher.lockFile(path);
                    var fileEntry = fileEntries[path];
                    if(!fileEntry) {
                        return reject(403);
                    }
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
                });
            },
            deleteFile: function(path) {
                return Promise.reject(new Error("Not supported"));
            },
            watchFile: function(path, callback) {
                watcher.watchFile(path, callback);
            },
            unwatchFile: function(path, callback) {
                watcher.unwatchFile(path, callback);
            },
            getCacheTag: function(path) {
                return new Promise(function(resolve, reject) {
                    var f = fileEntries[path];
                    if(!f) {
                        return reject(404);
                    }
                    f.file(function(stat) {
                        var tag = "" + stat.lastModifiedDate;
                        resolve(tag);
                    });
                });
            },
            getCapabilities: function() {
                return {};
            }
        };

        var watcher = poll_watcher(api, 3000);

        register(null, {
            fs: api
        });
    }
});
