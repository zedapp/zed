/*global define, Dropbox, chrome */
define(function(require, exports, module) {
    require("dep/dropbox.min.js");

    var async = require("../lib/async");

    Dropbox.AuthDriver.Chrome.prototype.expandUrl = function(url) {
        return url;
    };
    return function(rootPath, callback) {
        // Normalize
        rootPath = rootPath || "/";
        if (rootPath[0] !== "/") {
            rootPath = "/" + rootPath;
        }

        var callbackUrl = "https://" + chrome.runtime.id + ".chromiumapp.org/dropbox_receiver.html";
        var pollInterval = 10000;
        var tagCache = window.tagCache = {};

        console.log("Requires in oAuth paths:", callbackUrl);

        var dropbox = new Dropbox.Client({
            key: "g2qi3iece6qlu2n"
        });

        dropbox.authDriver(new Dropbox.AuthDriver.Chrome({
            receiverPath: callbackUrl
        }));

        dropbox.authenticate(function(err, dropbox) {
            if (err) {
                return callback(err);
            }

            function stripRoot(filename) {
                return filename.substring(rootPath.length);
            }

            function addRoot(filename) {
                return rootPath + filename;
            }

            function listFiles(callback) {
                var files = [];

                function readDir(dir, callback) {
                    dropbox.readdir(dir, function(err, stringEntries, dirStat, entries) {
                        if (err) {
                            return callback(err);
                        }
                        async.forEach(entries, function(entry, next) {
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
                    tagCache[path] = stat.versionTag;
                    callback(null, content);
                });
            }

            function writeFile(path, content, callback) {
                var fullPath = addRoot(path);
                dropbox.writeFile(fullPath, content, function(err, stat) {
                    if (err) {
                        return callback(err);
                    }
                    tagCache[path] = stat.versionTag;
                    callback();
                });
            }

            function deleteFile(path, callback) {
                var fullPath = addRoot(path);
                dropbox.remove(fullPath, callback);
            }

            var fileWatchers = window.fileWatchers = {};

            function watchFile(path, callback) {
                fileWatchers[path] = fileWatchers[path] || [];
                fileWatchers[path].push(callback);
            }

            function unwatchFile(path, callback) {
                fileWatchers[path].splice(fileWatchers[path].indexOf(callback), 1);
            }

            function pollFiles() {
                Object.keys(fileWatchers).forEach(function(path) {
                    if (fileWatchers[path].length === 0) return;

                    var fullPath = addRoot(path);
                    dropbox.stat(fullPath, function(err, stat) {
                        if (err) {
                            console.error("Got stat error while polling", fullPath, err);
                            return;
                        }
                        var tag = stat.versionTag;
                        if (stat.isRemoved) {
                            fileWatchers[path].forEach(function(fn) {
                                fn(path, "deleted");
                            });
                            fileWatchers[path] = [];
                        } else if (tagCache[path] !== tag) {
                            fileWatchers[path].forEach(function(fn) {
                                console.log(path, "changed!");
                                fn(path, "changed");
                            });
                            tagCache[path] = tag;
                        }
                    });
                });
            }

            setInterval(pollFiles, pollInterval);

            callback(null, {
                listFiles: listFiles,
                readFile: readFile,
                writeFile: writeFile,
                deleteFile: deleteFile,
                watchFile: watchFile,
                unwatchFile: unwatchFile
            });
        });
    };
});