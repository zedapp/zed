/*global define, chrome, _*/
define(function(require, exports, module) {
    var eventbus = require("./lib/eventbus");
    var options = require("./lib/options");
    var history = require("./lib/history");

    eventbus.declare('ioavailable');

    exports.dirname = function(path) {
        if (path[path.length - 1] === '/') {
            path = path.substring(0, path.length - 1);
        }
        var parts = path.split("/");
        return parts.slice(0, parts.length - 1).join("/");
    };

    exports.filename = function(path) {
        if (path[path.length - 1] === '/') {
            path = path.substring(0, path.length - 1);
        }
        var parts = path.split("/");
        return parts[parts.length - 1];
    };


    exports.hook = function() {
        var url = options.get("url");

        function setupMethods(io) {
            exports.listFiles = io.listFiles;
            exports.readFile = io.readFile;
            exports.writeFile = io.writeFile;
            exports.deleteFile = io.deleteFile;
            exports.getUrl = io.getUrl;
            exports.watchFile = io.watchFile;
            exports.unwatchFile = io.unwatchFile;
            exports.io = io;
            setTimeout(function() {
                eventbus.emit("ioavailable", exports);
            });
        }

        // TODO: Generalize this
        if (url.indexOf("settings:") === 0) {
            setupMethods(require("./fs/settings"));
        } else if (url.indexOf("manual:") === 0) {
            setupMethods(require("./fs/manual"));
        } else if (url.indexOf("syncfs:") === 0) {
            require("./fs/syncfs")(function(err, io) {
                setupMethods(io);
            });
        } else if (url.indexOf("dropbox:") === 0) {
            require(["./fs/dropbox"], function(dropbox) {
                dropbox(url.substring("dropbox:".length), function(err, io) {
                    setupMethods(io);
                });
            });
        } else if (url.indexOf("local:") === 0) {
            var id = url.substring("local:".length);
            // We're opening a specific previously opened directory here
            if (id) {
                chrome.fileSystem.restoreEntry(id, function(dir) {
                    history.pushProject(dir.fullPath, "local:" + id);
                    setupMethods(require("./fs/manual"));
                });
            } else {
                // Show pick directory
                chrome.fileSystem.chooseEntry({
                    type: "openDirectory"
                }, function(dir) {
                    var id = chrome.fileSystem.retainEntry(dir);
                    history.pushProject(dir.fullPath, "local:" + id);
                    setupMethods(require("./fs/localfs")(dir));
                });
            }
        } else {
            require('./fs/web')(url, options.get('username'), options.get('password'), function(err, io) {
                setupMethods(io);
            });
        }
    };
});