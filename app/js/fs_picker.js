/*global define, chrome */
define(function(require, exports, module) {
    var options = require("./lib/options");
    var history = require("./lib/history");
    return function(callback) {
        var url = options.get("url");

        // TODO: Generalize this
        if (url.indexOf("config:") === 0) {
            return callback(null, "./fs/config");
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
            history.pushProject(path.slice(1), url);
            return callback(null, {
                packagePath: "./fs/dropbox",
                rootPath: path
            });
        } else if (url.indexOf("local:") === 0) {
            var id = url.substring("local:".length);
            // We're opening a specific previously opened directory here
            if (id) {
                chrome.fileSystem.restoreEntry(id, function(dir) {
                    var title = dir.fullPath.slice(1);
                    history.pushProject(title, "local:" + id);
                    callback(null, {
                        packagePath: "./fs/local",
                        dir: dir
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
                    callback(null, {
                        packagePath: "./fs/local",
                        dir: dir
                    });
                });
            }
        } else {
            return callback(null, {
                packagePath: "./fs/web",
                url: url
            });
        }
    };
});
