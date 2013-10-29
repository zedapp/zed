/**
 * The project module exposes the same API as a file system module, but
 * picks an implementation based on the "url" argument passed to the editor URL
 */
/*global define, chrome*/
define(function(require, exports, module) {
    var eventbus = require("./lib/eventbus");
    var options = require("./lib/options");
    var history = require("./lib/history");

    eventbus.declare('ioavailable');

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
            require(["./fs/settings"], function(settingsfs) {
                setupMethods(settingsfs);
            });
        } else if (url.indexOf("manual:") === 0) {
            require(["./fs/manual"], function(manualfs) {
                setupMethods(manualfs);
            });
        } else if (url.indexOf("syncfs:") === 0) {
            require(["./fs/sync"], function(syncfs) {
                syncfs("notes", function(err, io) {
                    setupMethods(io);
                });
            });
        } else if (url.indexOf("dropbox:") === 0) {
            require(["./fs/dropbox"], function(dropboxfs) {
                var path = url.substring("dropbox:".length);
                history.pushProject(path, url);
                dropboxfs(path, function(err, io) {
                    setupMethods(io);
                });
            });
        } else if (url.indexOf("local:") === 0) {
            require(["./fs/local"], function(localfs) {
                var id = url.substring("local:".length);
                // We're opening a specific previously opened directory here
                if (id) {
                    chrome.fileSystem.restoreEntry(id, function(dir) {
                        history.pushProject(dir.fullPath, "local:" + id);
                        setupMethods(localfs(dir));
                    });
                } else {
                    // Show pick directory
                    chrome.fileSystem.chooseEntry({
                        type: "openDirectory"
                    }, function(dir) {
                        if(!dir) {
                            return chrome.app.window.current().close();
                        }
                        var id = chrome.fileSystem.retainEntry(dir);
                        history.pushProject(dir.fullPath, "local:" + id);
                        options.set("title", dir.fullPath);
                        setupMethods(localfs(dir));
                    });
                }
            });
        } else {
            require('./fs/web')(url, options.get('username'), options.get('password'), function(err, io) {
                setupMethods(io);
            });
        }
    };
});