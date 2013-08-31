/*global define chrome $ */
define(function(require, exports, module) {
    var events = require("../lib/events");
    
    var emitter = new events.EventEmitter(false);

    function getKey(key, callback) {
        if (chrome.storage) {
            chrome.storage.sync.get(key, function(results) {
                callback(results[key]);
            });
        } else {
            var val = localStorage[key];
            callback(val ? JSON.parse(val) : undefined);
            
        }
    }

    function setKey(key, value) {
        if (chrome.storage) {
            var obj = {};
            obj[key] = value;
            chrome.storage.sync.set(obj);
        } else {
            localStorage[key] = JSON.stringify(value);
        }
    }
    
    if(chrome.storage) {
        chrome.storage.onChanged.addListener(function(changes, areaName) {
            if(areaName === "sync") {
                Object.keys(changes).forEach(function(key) {
                    if(key.indexOf("settings:") === 0) {
                        var path = key.substring("settings:".length);
                        emitter.emit("filechanged:" + path, path);
                    }
                });
            }
        });
    } else {
        window.addEventListener("storage", function(event) {
            var key = event.key;
            if(key.indexOf("settings:") === 0) {
                var path = key.substring("settings:".length);
                emitter.emit("filechanged:" + path, path);
            }
        });
    }
    
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
        emitter.emit("filechanged:" + path, path, "changed");
        getKey("settings:", function(allDocs) {
            if(!allDocs[path]) {
                allDocs[path] = true;
                setKey("settings:", allDocs);
            }
            callback(null, "OK");
        });
    }

    function deleteFile(path, callback) {
        callback("Not supported");
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
        unwatchFile: unwatchFile
    };
});
