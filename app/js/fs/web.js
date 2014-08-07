/*global define, $ */
define(function(require, exports, module) {
    plugin.provides = ["fs"];
    return plugin;

    function plugin(options, imports, register) {
        var poll_watcher = require("./poll_watcher");
        var fsUtil = require("./util");
        var url = options.url;

        var mode = "directory"; // or: file
        var fileModeFilename; // if mode === "file"
        var watcher;

        $.ajaxTransport("+*", function(options, originalOptions, jqXHR){
            // Test for the conditions that mean we can/want to send/receive blobs or arraybuffers - we need XMLHttpRequest
            // level 2 (so feature-detect against window.FormData), feature detect against window.Blob or window.ArrayBuffer,
            // and then check to see if the dataType is blob/arraybuffer or the data itself is a Blob/ArrayBuffer
            if (window.FormData && ((options.dataType && (options.dataType == 'blob' || options.dataType == 'arraybuffer'))
                || (options.data && ((window.Blob && options.data instanceof Blob)
                    || (window.ArrayBuffer && options.data instanceof ArrayBuffer)))
                ))
            {
                return {
                    /**
                     * Return a transport capable of sending and/or receiving blobs - in this case, we instantiate
                     * a new XMLHttpRequest and use it to actually perform the request, and funnel the result back
                     * into the jquery complete callback (such as the success function, done blocks, etc.)
                     *
                     * @param headers
                     * @param completeCallback
                     */
                    send: function(headers, completeCallback){
                        var xhr = new XMLHttpRequest(),
                            url = options.url || window.location.href,
                            type = options.type || 'GET',
                            dataType = options.dataType || 'text',
                            data = options.data || null,
                            async = options.async || true;

                        xhr.addEventListener('load', function(){
                            var res = {};

                            res[dataType] = xhr.response;
                            completeCallback(xhr.status, xhr.statusText, res, xhr.getAllResponseHeaders());
                        });

                        xhr.open(type, url, async);
                        xhr.responseType = dataType;
                        xhr.send(data);
                    },
                    abort: function(){
                        jqXHR.abort();
                    }
                };
            }
        });

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
                var api = {
                    listFiles: listFiles,
                    readFile: readFile,
                    writeFile: writeFile,
                    deleteFile: deleteFile,
                    watchFile: watchFile,
                    unwatchFile: unwatchFile,
                    getCacheTag: getCacheTag
                };

                watcher = poll_watcher(api, 5000);

                register(null, {
                    fs: api
                });
            },
            error: function(xhr) {
                register(xhr);
            }
        });
    }
});
