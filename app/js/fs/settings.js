/*global define, chrome, $ */
define(function(require, exports, module) {
    var events = require("../lib/events");

    var emitter = window.emitter = new events.EventEmitter(false);

    function getKey(key, callback) {
        chrome.storage.sync.get(key, function(results) {
            callback(results[key]);
        });
    }

    function setKey(key, value) {
        var obj = {};
        obj[key] = value;
        chrome.storage.sync.set(obj);
    }
    
    function removeKey(key) {
        chrome.storage.sync.remove(key);
    }

    chrome.storage.onChanged.addListener(function(changes, areaName) {
        if(areaName === "sync") {
            Object.keys(changes).forEach(function(key) {
                if(key.indexOf("settings:") === 0) {
                    var path = key.substring("settings:".length);
                    emitter.emit("filechanged:" + path, path, "changed");
                }
            });
        }
    });

    function listFiles(callback) {
        var files = [];
        $.get("settings/all", function(text) {
            var paths = text.split("\n");
            paths.forEach(function(path) {
                if(path) {
                    files.push(path);
                }
            });
            getKey("settings:", function(docs) {
                docs = docs || {};
                Object.keys(docs).forEach(function(path) {
                    if(!path) {
                        return;
                    }
                    var parts = path.split('/');
                    for(var i = 0; i < parts.length; i++) {
                        if(parts[i][0] === '.') {
                            return;
                        }
                    }
                    if(files.indexOf(path) === -1) {
                        files.push(path);
                    }
                });
                callback(null, files);
            });
        });
    }

    function readFile(path, callback) {
        getKey("settings:" + path, function(val) {
            if (!val) {
                return $.ajax({
                    method: "GET",
                    url: "settings" + path,
                    dataType: "text",
                    success: function(result) {
                        callback(null, result, {
                            readOnly: path.indexOf(".default.") !== -1
                        });
                    },
                    error: function(xhr) {
                        callback(xhr.status);
                    }
                });
            } else {
                callback(null, val);
            }
        });
    }

    function writeFile(path, content, callback) {
        setKey("settings:" + path, content);
        //emitter.emit("filechanged:" + path, path, "changed");
        getKey("settings:", function(allDocs) {
            allDocs = allDocs || {};
            if(!allDocs[path]) {
                allDocs[path] = true;
                setKey("settings:", allDocs);
            }
            callback(null, "OK");
        });
    }

    function deleteFile(path, callback) {
        removeKey("settings:" + path);
        emitter.emit("filechanged:" + path, path, "deleted");
        getKey("settings:", function(allDocs) {
            allDocs = allDocs || {};
            delete allDocs[path];
            setKey("settings:", allDocs);
            callback(null, "OK");
        });
    }

    function getUrl(path, callback) {
        callback("Not supported");
    }

    function watchFile(path, callback) {
        emitter.on("filechanged:" + path, callback);
    }

    function unwatchFile(path, callback) {
        emitter.removeListener("filechanged:" + path, callback);
    }

    module.exports = {
        listFiles: listFiles,
        readFile: readFile,
        writeFile: writeFile,
        deleteFile: deleteFile,
        getUrl: getUrl,
        watchFile: watchFile,
        unwatchFile: unwatchFile,
    };
});
