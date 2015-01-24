/*global define, chrome */
define(function(require, exports, module) {
    var options = require("./lib/options");
    return function(url) {
        // TODO: Generalize this
        if (url.indexOf("config:") === 0) {
            return Promise.resolve("./fs/config.chrome");
        } else if (url.indexOf("nwconfig:") === 0) {
            return Promise.resolve("./fs/config.nw");
        } else if (url.indexOf("manual:") === 0) {
            return Promise.resolve({
                packagePath: "./fs/static",
                url: "manual",
                readOnlyFn: function() {
                    return true;
                }
            });
        } else if (url.indexOf("syncfs:") === 0) {
            // Deprecated
            return Promise.resolve({
                packagePath: "./fs/sync",
                namespace: "notes"
            });
        } else if (url.indexOf("dropbox:") === 0) {
            var path = url.substring("dropbox:".length);
            return Promise.resolve({
                packagePath: "./fs/dropbox",
                rootPath: path
            });
        } else if (url.indexOf("local:") === 0) {
            var id = url.substring("local:".length);
            // We're opening a specific previously opened directory here
            return new Promise(function(resolve, reject) {
                if (id) {
                    chrome.fileSystem.restoreEntry(id, function(dir) {
                        if(!dir) {
                            return reject(new Error("Not accessible"));
                        }
                        resolve({
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
                        resolve({
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
            });
        } else if (url.indexOf("node:") === 0) {
            var path = url.substring("node:".length);
            if (path) {
                return Promise.resolve({
                    packagePath: "./fs/node",
                    dir: path
                });
            } else {
                return new Promise(function(resolve, reject) {
                    require(["./lib/folderpicker.nw"], function(folderPicker) {
                        folderPicker().then(function(path) {
                            options.set("title", path);
                            options.set("url", "node:" + path);
                            resolve({
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
                })
            }
        } else if(url.indexOf("textarea:") === 0) {
            var text = url.substring("textarea:".length);
            return Promise.resolve({
                packagePath: "./fs/textarea",
                text: text,
                id: options.get("id")
            });
        } else if(url.indexOf("gh:") === 0) {
            var repoBranch = url.substring("gh:".length);
            var parts = repoBranch.split(":");
            var repo = parts[0];
            var branch = parts[1] || "master";
            return Promise.resolve({
                packagePath: "./fs/github",
                repo: repo,
                branch: branch
            });
        } else if(url.indexOf("s3:") === 0) {
            var bucket = url.substring("s3:".length);
            return Promise.resolve({
                packagePath: "./fs/s3",
                bucket: bucket
            });
        } else {
            return Promise.resolve({
                packagePath: "./fs/web",
                url: url
            });
        }
    };
});
