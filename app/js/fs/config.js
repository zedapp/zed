/*global define, chrome */
define(function(require, exports, module) {

    return function(isConfigurationProject, callback) {
        require(["./union", "./static", "./local", "./sync"], function(unionfs, staticfs, localfs, syncfs) {

            chrome.storage.local.get("configDir", function(results) {
                if (results.configDir) {
                    console.log("Using local configuration dir");
                    staticFs(function(err, configStatic) {
                        chrome.fileSystem.restoreEntry(results.configDir, function(dir) {
                            if (!dir) {
                                console.error("Could not open configuration dir, please reset it. Falling back to syncFS.");
                                return syncConfig(callback);
                            }
                            localfs(dir, function(err, configLocal) {
                                unionfs([configLocal, configStatic], {
                                    watchSelf: !isConfigurationProject
                                }, function(err, io) {
                                    callback(null, io);
                                });
                            });
                        });
                    });
                } else {
                    syncConfig(callback);
                }
            });

            function staticFs(callback) {
                staticfs("config", {
                    readOnlyFn: function(path) {
                        return path !== "/.zedstate" && path !== "/user.json" && path !== "/user.css";
                    }
                }, callback);
            }

            function syncConfig(callback) {
                staticFs(function(err, configStatic) {
                    syncfs("config", function(err, configSync) {
                        unionfs([configSync, configStatic], {
                            watchSelf: !isConfigurationProject
                        }, callback);
                    });
                });
            }
        });
    };
});