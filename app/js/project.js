/**
 * The project module exposes the same API as a file system module, but
 * picks an implementation based on the "url" argument passed to the editor URL
 */
/*global define, chrome, $ */
define(function(require, exports, module) {
    var eventbus = require("./lib/eventbus");
    var options = require("./lib/options");
    var history = require("./lib/history");
    var command = require("./command");
    var bgPage = require("./lib/background_page");

    eventbus.declare('ioavailable');

    exports.hook = function() {
        var url = options.get("url");

        function setupMethods(io) {
            exports.listFiles = io.listFiles;
            exports.readFile = io.readFile;
            exports.writeFile = io.writeFile;
            exports.deleteFile = io.deleteFile;
            exports.watchFile = io.watchFile;
            exports.unwatchFile = io.unwatchFile;
            exports.io = io;
            setTimeout(function() {
                eventbus.emit("ioavailable", exports);
            });
        }

        // TODO: Generalize this
        if (url.indexOf("config:") === 0) {
            require(["./fs/config"], function(configfs) {
                configfs(true, function(err, io) {
                    setupMethods(io);
                });
            });
        } else if (url.indexOf("manual:") === 0) {
            require(["./fs/static"], function(staticfs) {
                staticfs("manual", {
                    readOnlyFn: function() {
                        return true;
                    }
                }, function(err, io) {
                    setupMethods(io);
                });
            });
        } else if (url.indexOf("syncfs:") === 0) {
            require(["./fs/sync"], function(syncfs) {
                syncfs("notes", function(err, io) {
                    // In order to not confuse users, we'll prefill the project with a welcome.md file
                    io.listFiles(function(err, files) {
                        if (err) {
                            return console.error("List file error", err);
                        }
                        if (files.length === 0) {
                            var finished = 0;

                            function doneCallback(err) {
                                finished++;
                                if (finished === 2) {
                                    setupMethods(io);
                                }
                            }
                            io.writeFile("/welcome.md", require("text!../../notes.md"), doneCallback);
                            io.writeFile("/.zedstate", '{"session.current": ["/welcome.md"]}', doneCallback);
                        } else {
                            setupMethods(io);
                        }
                    });
                });
            });
        } else if (url.indexOf("dropbox:") === 0) {
            require(["./fs/dropbox"], function(dropboxfs) {
                var path = url.substring("dropbox:".length);
                history.pushProject(path.slice(1), url);
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
                        var title = dir.fullPath.slice(1);
                        history.pushProject(title, "local:" + id);
                        localfs(dir, function(err, io) {
                            setupMethods(io);
                        });
                    });
                } else {
                    // Show pick directory
                    chrome.fileSystem.chooseEntry({
                        type: "openDirectory"
                    }, function(dir) {
                        if (!dir) {
                            return chrome.app.window.current().close();
                        }
                        var id = chrome.fileSystem.retainEntry(dir);
                        var title = dir.fullPath.slice(1);
                        history.pushProject(title, "local:" + id);
                        options.set("title", title);
                        options.set("url", "local:" + id);
                        bgPage.getBackgroundPage().projects["local:" + id] = chrome.app.window.current();
                        localfs(dir, function(err, io) {
                            setupMethods(io);
                        });
                    });
                }
            });
        } else {
            require('./fs/web')(url, function(err, io) {
                setupMethods(io);
            });
        }
    };

    exports.init = function() {
        $("title").text(options.get("title") + " [ Zed ]");
    };

    command.define("Project:Open Project Picker", {
        exec: function() {
            window.opener.focusMe();
        },
        readOnly: true
    });

    command.define("Project:Rename", {
        exec: function() {
            require(["./lib/history", "./lib/options", "./lib/ui"], function(history, options, ui) {
                ui.prompt({
                    message: "Rename project to:",
                    input: options.get('title')
                }, function(err, name) {
                    if (!name) {
                        // canceled
                        return;
                    }
                    options.set("title", name);
                    history.renameProject(options.get("url"), name);
                    eventbus.emit("projecttitlechanged");
                });
            });
        },
        readOnly: true
    });
});