/*global define, $ */
define(function(require, exports, module) {
    plugin.consumes = ["history"];
    plugin.provides = ["fs"];
    return plugin;

    function plugin(options, imports, register) {
        var poll_watcher = require("./poll_watcher");
        var fsUtil = require("./util");
        var niceName = require("../lib/url_extractor").niceName;

        var history = imports.history;

        var url = options.url;
        var user = options.user;
        var pass = options.pass;
        var keep = options.keep;

        var mode = "directory"; // or: file
        var fileModeFilename; // if mode === "file"
        var watcher;
        var capabilities = {};

        function promisedAjax(obj) {
            return new Promise(function(resolve, reject) {
                obj.username = user || undefined;
                obj.password = pass || undefined;
                obj.success = resolve;
                obj.error = reject;
                $.ajax(obj);
            });
        }

        function listFiles() {
            return new Promise(function(resolve, reject) {
                if (mode === "file") {
                    return resolve([fileModeFilename]);
                }
                $.ajax({
                    type: "POST",
                    url: url,
                    data: {
                        action: 'filelist'
                    },
                    username: user || undefined,
                    password: pass || undefined,
                    success: function(res) {
                        var items = res.split("\n");
                        for (var i = 0; i < items.length; i++) {
                            if (!items[i]) {
                                items.splice(i, 1);
                                i--;
                            }
                        }
                        resolve(items);
                    },
                    error: function(xhr) {
                        reject(xhr.status);
                    },
                    dataType: "text"
                });
            });
        }

        function readFile(path, binary) {
            if (mode === "file") {
                if (path === "/.zedstate") {
                    return Promise.resolve(JSON.stringify({
                        "session.current": [fileModeFilename]
                    }));
                }
                if (path !== fileModeFilename) {
                    return Promise.reject(404);
                }
            }
            return new Promise(function(resolve, reject) {
                $.ajax({
                    type: "GET",
                    url: url + path,
                    username: user || undefined,
                    password: pass || undefined,
                    error: function(xhr) {
                        reject(xhr.status);
                    },
                    success: function(res, status, xhr) {
                        watcher.setCacheTag(path, xhr.getResponseHeader("ETag"));
                        if(binary) {
                            res = fsUtil.uint8ArrayToBinaryString(new Uint8Array(res));
                        }
                        resolve(res);
                    },
                    dataType: binary ? "arraybuffer" : "text"
                });
            });
        }

        function writeFile(path, content, binary) {
            if (mode === "file") {
                // Ignore state saves
                if (path === "/.zedstate") {
                    return Promise.resolve();
                }
                if (path !== fileModeFilename) {
                    return Promise.reject(500);
                }
            }
            watcher.lockFile(path);
            return new Promise(function(resolve, reject) {
                $.ajax(url + path, {
                    type: 'PUT',
                    data: binary ? fsUtil.binaryStringAsUint8Array(content) : content,
                    // dataType: 'text',
                    contentType: 'application/octet-stream',
                    processData: false,
                    username: user || undefined,
                    password: pass || undefined,
                    success: function(res, status, xhr) {
                        watcher.setCacheTag(path, xhr.getResponseHeader("ETag"));
                        watcher.unlockFile(path);
                        resolve(res);
                    },
                    error: function(xhr) {
                        watcher.unlockFile(path);
                        reject(xhr.status || xhr.statusText);
                    }
                });
            });
        }

        function deleteFile(path) {
            return new Promise(function(resolve, reject) {
                $.ajax(url + path, {
                    type: 'DELETE',
                    dataType: 'text',
                    success: reject,
                    username: user || undefined,
                    password: pass || undefined,
                    error: function(xhr) {
                        resolve(xhr.status);
                    }
                });
            });
        }

        function watchFile(path, callback) {
            watcher.watchFile(path, callback);
        }

        function unwatchFile(path, callback) {
            watcher.unwatchFile(path, callback);
        }

        function getCacheTag(path) {
            return new Promise(function(resolve, reject) {
                $.ajax(url + path, {
                    type: 'HEAD',
                    username: user || undefined,
                    password: pass || undefined,
                    success: function(data, status, xhr) {
                        var newEtag = xhr.getResponseHeader("ETag");
                        resolve(newEtag);
                    },
                    error: function(xhr) {
                        reject(xhr.status);
                    }
                });
            });
        }

        function run(command, stdin) {
            return new Promise(function(resolve, reject) {
                $.ajax(url, {
                    type: "POST",
                    url: url,
                    data: {
                        action: 'run',
                        command: JSON.stringify(command),
                        stdin: stdin
                    },
                    username: user || undefined,
                    password: pass || undefined,
                    success: function(res) {
                        resolve(res);
                    },
                    error: function(xhr) {
                        reject(xhr.status);
                    },
                    dataType: "text"
                });
            });
        }

        // Check if we're dealing with one file
        $.ajax(url, {
            type: 'HEAD',
            username: user || undefined,
            password: pass || undefined,
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
                var api = {
                    listFiles: listFiles,
                    readFile: readFile,
                    writeFile: writeFile,
                    deleteFile: deleteFile,
                    watchFile: watchFile,
                    unwatchFile: unwatchFile,
                    getCacheTag: getCacheTag,
                    getCapabilities: function() {
                        return capabilities;
                    },
                    run: run
                };

                watcher = poll_watcher(api, 5000);

                if (keep) {
                    history.pushProject(niceName(url), options.fullUrl);
                }

                register(null, {
                    fs: api
                });
            },
            error: function(xhr) {
                register(xhr);
            }
        });

        promisedAjax({
            type: 'POST',
            url: url,
            data: {
                action: 'capabilities'
            },
            dataType: 'json'
        }).then(function(result) {
            capabilities = result;
        });
    }
});
