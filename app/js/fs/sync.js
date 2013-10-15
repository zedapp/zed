/*global define, chrome, _ */
define(function(require, exports, module) {


    return function(namespace, callback) {
        namespace = namespace + "|";

        // As syncfs does not yet support creating directories, we'll use it as a flat namespace
        // https://groups.google.com/a/chromium.org/forum/#!topic/chromium-apps/v-uK6IPOCE8
        function decodePath(path) {
            return "/" + path.substring(namespace.length).replace(/\|/g, "/");
        }

        function encodePath(path) {
            return namespace + path.substring(1).replace(/\//g, "|", path);
        }

        chrome.syncFileSystem.requestFileSystem(function(fs) {
            var pollInterval = 2000;

            var fileWatchers = {};
            var tagCache = {};

            function pollFiles() {
                Object.keys(fileWatchers).forEach(function(path) {
                    if (fileWatchers[path].length === 0) return;

                    var encodedPath = encodePath(path);
                    fs.root.getFile(encodedPath, {}, function(f) {
                        f.file(function(stat) {
                            var tag = "" + stat.lastModifiedDate;
                            if (tagCache[path] !== tag) {
                                fileWatchers[path].forEach(function(fn) {
                                    console.log(path, "changed!");
                                    fn(path, "changed");
                                });
                                tagCache[path] = tag;
                            }
                        });
                    }, function() {
                        // Removed
                        fileWatchers[path].forEach(function(fn) {
                            fn(path, "deleted");
                        });
                        fileWatchers[path] = [];
                    });
                });
            }

            setInterval(pollFiles, pollInterval);

            var operations = {
                listFiles: function(callback) {
                    var reader = fs.root.createReader();
                    reader.readEntries(function(entries) {
                        var results = [];
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
                        callback(null, results);
                    }, callback);
                },
                readFile: function(path, callback) {
                    var encodedPath = encodePath(path);
                    fs.root.getFile(encodedPath, {}, function(f) {
                        var fileReader = new FileReader();
                        fileReader.onload = function(e) {
                            callback(null, e.target.result);
                        };
                        f.file(function(file) {
                            fileReader.readAsText(file);
                            tagCache[path] = "" + file.lastModifiedDate;
                        });
                    }, callback);
                },
                writeFile: function(path, content, callback) {
                    var encodedPath = encodePath(path);
                    fs.root.getFile(encodedPath, {
                        create: true
                    }, function(fileEntry) {
                        // For whatever we need to truncate in a separate step
                        // Otherwise we'll end up overwriting the start of the file only.
                        fileEntry.createWriter(function(fileTruncater) {
                            fileTruncater.onwriteend = function() {
                                fileEntry.createWriter(function(fileWriter) {
                                    fileWriter.onwriteend = function() {
                                        fileEntry.file(function(stat) {
                                            tagCache[path] = "" + stat.lastModifiedDate;
                                            callback();
                                        });
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
                },
                deleteFile: function(path, callback) {
                    var encodedPath = encodePath(path);
                    fs.root.getFile(encodedPath, {}, function(fileEntry) {
                        fileEntry.remove(function() {
                            callback();
                        }, callback);
                    });
                },
                getUrl: function(path, callback) {
                    var encodedPath = encodePath(path);
                    fs.root.getFile(encodedPath, {}, function(fileEntry) {
                        callback(null, fileEntry.toURL());
                    });
                },
                watchFile: function(path, callback) {
                    fileWatchers[path] = fileWatchers[path] || [];
                    fileWatchers[path].push(callback);
                },
                unwatchFile: function(path, callback) {
                    fileWatchers[path].splice(fileWatchers[path].indexOf(callback), 1);
                }
            };
            callback(null, operations);
            // operations.writeFile("/welcome.md", require("text!../../notes.md"), function(err) {
            //     if(err) {
            //         console.error(err);
            //     }
            // });
        });
    };
});