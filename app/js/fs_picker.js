/*global define, chrome */
define(function(require, exports, module) {
    var options = require("./lib/options");
    return function(callback) {
        var url = options.get("url");

        // TODO: Generalize this
        if (url.indexOf("config:") === 0) {
            return callback(null, "./fs/config.chrome");
        } else if (url.indexOf("nwconfig:") === 0) {
            return callback(null, "./fs/config.nw");
        } else if (url.indexOf("manual:") === 0) {
            return callback(null, {
                packagePath: "./fs/static",
                url: "manual",
                readOnlyFn: function() {
                    return true;
                }
            });
        } else if (url.indexOf("syncfs:") === 0) {
            return callback(null, {
                packagePath: "./fs/sync",
                namespace: "notes"
            });
            // // In order to not confuse users, we'll prefill the project with a welcome.md file
            // io.listFiles(function(err, files) {
            //     if (err) {
            //         return console.error("List file error", err);
            //     }
            //     if (files.length === 0) {
            //         var finished = 0;

            //         function doneCallback(err) {
            //             finished++;
            //             if (finished === 2) {
            //                 setupMethods(io);
            //             }
            //         }
            //         io.writeFile("/welcome.md", require("text!../../notes.md"), doneCallback);
            //         io.writeFile("/.zedstate", '{"session.current": ["/welcome.md"]}', doneCallback);
            //     } else {
            //         setupMethods(io);
            //     }
            // });
        } else if (url.indexOf("dropbox:") === 0) {
            var path = url.substring("dropbox:".length);
            return callback(null, {
                packagePath: "./fs/dropbox",
                rootPath: path
            });
        } else if (url.indexOf("local:") === 0) {
            var id = url.substring("local:".length);
            // We're opening a specific previously opened directory here
            if (id) {
                chrome.fileSystem.restoreEntry(id, function(dir) {
                    callback(null, {
                        packagePath: "./fs/local",
                        dir: dir,
                        id: id
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
                    options.set("title", title);
                    options.set("url", "local:" + id);
                    callback(null, {
                        packagePath: "./fs/local",
                        dir: dir,
                        id: id
                    });
                    setTimeout(function() {
                        console.log("Now setting open Projects");
                        var openProjects = zed.getService("windows").openProjects;
                        delete openProjects["local:"];
                        openProjects["local:" + id] = chrome.app.window.current();
                    }, 2000);
                });
            }
        } else if (url.indexOf("node:") === 0) {
            var path = url.substring("node:".length);
            if (path) {
                return callback(null, {
                    packagePath: "./fs/node",
                    dir: path
                });
            } else {
                require(["./lib/folderpicker.nw"], function(folderPicker) {
                    folderPicker(function(err, path) {
                        options.set("title", path);
                        options.set("url", "node:" + path);
                        callback(null, {
                            packagePath: "./fs/node",
                            dir: path
                        });
                        setTimeout(function() {
                            var openProjects = zed.getService("windows").openProjects;
                            delete openProjects["node:"];
                            openProjects["node:" + path] = nodeRequire("nw.gui").Window.get();
                        }, 2000);
                    });
                });
            }
        } else if(url.indexOf("textarea:") === 0) {
            var text = url.substring("textarea:".length);
            return callback(null, {
                packagePath: "./fs/textarea",
                text: text,
                id: options.get("id")
            });
        } else {
            return callback(null, {
                packagePath: "./fs/web",
                url: url
            });
        }
    };
});
