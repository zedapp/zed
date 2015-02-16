/*global define, chrome, _, zed */
define(function(require, exports, module) {
    plugin.provides = ["fs"];
    return plugin;

    function plugin(options, imports, register) {
        var poll_watcher = require("./poll_watcher");
        var fsUtil = require("./util");
        var namespace = options.namespace;

        namespace = namespace + "|";

        // As syncfs does not yet support creating directories, we'll use it as a flat namespace
        // https://groups.google.com/a/chromium.org/forum/#!topic/chromium-apps/v-uK6IPOCE8
        function decodePath(path) {
            path = normalizePath(path);
            return "/" + path.substring(namespace.length).replace(/\|/g, "/");
        }

        function encodePath(path) {
            path = normalizePath(path);
            return namespace + path.substring(1).replace(/\//g, "|", path);
        }

        function normalizePath(path) {
            path = path.replace(/\/\/+/g, '/');
            var parts = path.split('/');
            for (var i = 0; i < parts.length; i++) {
                var el = parts[i];
                if (el === ".") {
                    parts.splice(i, 1);
                    i--;
                } else if (el == "..") {
                    parts.splice(i - 1, 2);
                    i -= 2;
                }
            }
            return parts.join('/');
        }

        function wrapFilesystem(root) {
            var api = {
                listFiles: function() {
                    return new Promise(function(resolve, reject) {
                        var reader = root.createReader();

                        var results = [];
                        function readDirEntriesUntilEmpty() {
                            reader.readEntries(function(entries) {
                                for (var i = 0; i < entries.length; i++) {
                                    var entry = entries[i];
                                    if (entry.name.indexOf(namespace) !== 0) {
                                        continue;
                                    }
                                    if (entry.name == namespace + ".zedstate") {
                                        continue;
                                    }
                                    results.push(decodePath(entry.name));
                                }
                                if(entries.length === 0) {
                                    resolve(results);
                                } else {
                                    readDirEntriesUntilEmpty();
                                }
                            }, reject);
                        }
                        readDirEntriesUntilEmpty();
                    });
                },
                readFile: function(path, binary) {
                    return new Promise(function(resolve, reject) {
                        var encodedPath = encodePath(path);
                        root.getFile(encodedPath, {}, function(f) {
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
                    var encodedPath = encodePath(path);
                    watcher.lockFile(path);
                    return (new Promise(function(resolve, reject) {
                        root.getFile(encodedPath, {
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
                                            reject(e.toString());
                                        };

                                        var blob = binary ? new Blob([fsUtil.binaryStringAsUint8Array(content)]) : new Blob([content]);
                                        fileWriter.write(blob);
                                    }, function(err) {
                                        reject(err);
                                    });
                                };
                                fileTruncater.truncate(0);
                            });
                        }, function(err) {
                            reject(err);
                        });
                    })).catch(function(err) {
                        watcher.unlockFile(path);
                        throw err;
                    });

                    function contentAsUint8Array() {
                        var buf = new Uint8Array(content.length);
                        for(var i = 0; i < content.length; i++) {
                            buf[i] = content.charCodeAt(i);
                        }
                        return buf;
                    }
                },
                deleteFile: function(path) {
                    var encodedPath = encodePath(path);
                    return new Promise(function(resolve, reject) {
                        root.getFile(encodedPath, {}, function(fileEntry) {
                            fileEntry.remove(resolve, reject);
                        }, reject);
                    });
                },
                watchFile: function(path, callback) {
                    watcher.watchFile(path, callback);
                },
                unwatchFile: function(path, callback) {
                    watcher.unwatchFile(path, callback);
                },
                getCacheTag: function(path) {
                    var encodedPath = encodePath(path);
                    return new Promise(function(resolve, reject) {
                        root.getFile(encodedPath, {}, function(f) {
                            f.file(function(stat) {
                                resolve("" + stat.lastModifiedDate);
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

            register(null, {
                fs: api
            });
        }
        chrome.syncFileSystem.requestFileSystem(function(fs) {
            if (!fs) {
                // Fallback to non-sync filesystem
                console.log("Failed to get a sync file system, going to request a local filesystem instead.");
                (window.requestFileSystem || window.webkitRequestFileSystem)(window.PERSISTENT, 100 * 1024 * 1024, function(fs) {
                    console.log("Successfully obtained a local file system!");
                    wrapFilesystem(fs.root);
                }, function(err) {
                    console.error("Failed to request local filesystem", err);
                    var ui = zed.getService("ui");
                    ui.unblockUI();
                    ui.prompt({
                        message: "Your Chrome does not seem to support local file systems, nor sync file systems, we need this to operate."
                    });
                });
            } else {
                wrapFilesystem(fs.root);
            }
        });
    }
});
