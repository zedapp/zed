define(function(require, exports, module) {
    var events = require("events");
    var documents = ["/settings.json", "/keys.json"];

    var emitter = new events.EventEmitter(false);

    function getKey(key, callback) {
        if (chrome.storage) {
            chrome.storage.sync.get(key, function(results) {
                callback(results[key]);
            });
        } else {
            callback(localStorage[key]);
        }
    }

    function setKey(key, value) {
        if (chrome.storage) {
            var obj = {};
            obj[key] = value;
            chrome.storage.sync.set(obj);
        } else {
            localStorage[key] = value;
        }
    }
    
    if(chrome.storage) {
        chrome.storage.onChanged.addListener(function(changes, areaName) {
            if(areaName === "sync") {
                Object.keys(changes).forEach(function(key) {
                    if(key.indexOf("settings:") === 0) {
                        emitter.emit("filechanged:" + key.substring("settings:".length));
                    }
                });
            }
        });
    } else {
        window.addEventListener("storage", function(event) {
            var key = event.key;
            if(key.indexOf("settings:") === 0) {
                emitter.emit("filechanged:" + key.substring("settings:".length));
            }
        });
    }
    
    module.exports = function() {
        function filelist(callback) {
            callback(null, documents);
        }

        function readFile(path, callback) {
            getKey("settings:" + path, function(val) {
                if (!val) {
                    return $.get("settings" + path, function(result) {
                        callback(null, result);
                    }, "text");
                }
                callback(null, val);
            });
        }

        function writeFile(path, content, callback) {
            setKey("settings:" + path, content);
            emitter.emit("filechanged:" + path);
            callback(null, "OK");
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

        return {
            filelist: filelist,
            readFile: readFile,
            writeFile: writeFile,
            deleteFile: deleteFile,
            getUrl: getUrl,
            watchFile: watchFile,
            unwatchFile: unwatchFile
        };
    };
});