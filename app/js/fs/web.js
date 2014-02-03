/*global define, $ */
define(function(require, exports, module) {
    var poll_watcher = require("./poll_watcher");

    return function(url, callback) {
        var mode = "directory"; // or: file
        var fileModeFilename; // if mode === "file"
        var watcher;

        function listFiles(callback) {
            if (mode === "file") {
                return callback(null, [fileModeFilename]);
            }
            $.ajax({
                type: "POST",
                url: url,
                data: {
                    action: 'filelist'
                },
                success: function(res) {
                    var items = res.split("\n");
                    for (var i = 0; i < items.length; i++) {
                        if (!items[i]) {
                            items.splice(i, 1);
                            i--;
                        }
                    }
                    callback(null, items);
                },
                error: function(xhr) {
                    callback(xhr.status);
                },
                dataType: "text"
            });
        }

        function readFile(path, callback) {
            if (mode === "file") {
                if (path === "/.zedstate") {
                    return callback(null, JSON.stringify({
                        "session.current": [fileModeFilename]
                    }));
                }
                if (path !== fileModeFilename) {
                    return callback(404);
                }
            }
            $.ajax({
                type: "GET",
                url: url + path,
                error: function(xhr) {
                    callback(xhr.status);
                },
                success: function(res, status, xhr) {
                    watcher.setCacheTag(path, xhr.getResponseHeader("ETag"));
                    callback(null, res);
                },
                dataType: "text"
            });
        }

        function writeFile(path, content, callback) {
            if (mode === "file") {
                // Ignore state saves
                if (path === "/.zedstate") {
                    return callback();
                }
                if (path !== fileModeFilename) {
                    return callback(500);
                }
            }
            watcher.lockFile(path);
            $.ajax(url + path, {
                type: 'PUT',
                data: content,
                dataType: 'text',
                success: function(res, status, xhr) {
                    watcher.setCacheTag(path, xhr.getResponseHeader("ETag"));
                    watcher.unlockFile(path);
                    callback(null, res);
                },
                error: function(xhr) {
                    watcher.unlockFile(path);
                    callback(xhr.status || xhr.statusText);
                }
            });
        }

        function deleteFile(path, callback) {
            $.ajax(url + path, {
                type: 'DELETE',
                dataType: 'text',
                success: function(res) {
                    callback(null, res);
                },
                error: function(xhr) {
                    callback(xhr.status);
                }
            });
        }

        function watchFile(path, callback) {
            watcher.watchFile(path, callback);
        }

        function unwatchFile(path, callback) {
            watcher.unwatchFile(path, callback);
        }

        function getCacheTag(path, callback) {
            $.ajax(url + path, {
                type: 'HEAD',
                success: function(data, status, xhr) {
                    var newEtag = xhr.getResponseHeader("ETag");
                    callback(null, newEtag);
                },
                error: function(xhr) {
                    callback(xhr.status);
                }
            });
        }

        // Check if we're dealing with one file
        $.ajax(url, {
            type: 'HEAD',
            success: function(data, status, xhr) {
                var type = xhr.getResponseHeader("X-Type");
                if (type === "file") {
                    mode = "file";
                    var urlParts = url.split('/');
                    fileModeFilename = "/" + urlParts[urlParts.length - 1];
                    url = urlParts.slice(0, urlParts.length - 1).join("/");
                    console.log("File mode", fileModeFilename, url);
                }

                console.log("WebFS mode:", mode);
                var fs = {
                    listFiles: listFiles,
                    readFile: readFile,
                    writeFile: writeFile,
                    deleteFile: deleteFile,
                    watchFile: watchFile,
                    unwatchFile: unwatchFile,
                    getCacheTag: getCacheTag
                };

                watcher = poll_watcher(fs, 5000);

                callback(null, fs);
            },
            error: function(xhr) {
                callback(xhr);
            }
        });
    };
});