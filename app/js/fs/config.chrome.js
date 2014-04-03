/*global define, chrome */
define(function(require, exports, module) {
    var architect = require("../../dep/architect");
    plugin.provides = ["fs"];
    return plugin;

    function plugin(options, imports, register) {
        var watchSelf = options.watchSelf;

        chrome.storage.local.get("configDir", function(results) {
            if (results.configDir) {
                console.log("Using local configuration dir");
                staticFs(function(err, configStatic) {
                    chrome.fileSystem.restoreEntry(results.configDir, function(dir) {
                        if (!dir) {
                            console.error("Could not open configuration dir, please reset it. Falling back to syncFS.");
                            return syncConfig();
                        }
                        getFs({
                            packagePath: "fs/local",
                            dir: dir,
                            id: results.configDir,
                            dontRegister: true
                        }, function(err, configLocal) {
                            getFs({
                                packagePath: "fs/union",
                                fileSystems: [configLocal, configStatic],
                                watchSelf: watchSelf
                            }, function(err, fs) {
                                register(null, {
                                    fs: fs
                                });
                            });
                        });
                    });
                });
            } else {
                syncConfig();
            }
        });

        function staticFs(callback) {
            getFs({
                packagePath: "fs/static",
                url: "config",
                readOnlyFn: function(path) {
                    return path !== "/.zedstate" && path !== "/user.json" && path !== "/user.css";
                }
            }, callback);
        }

        function syncConfig() {
            staticFs(function(err, configStatic) {
                getFs({
                    packagePath: "./fs/sync",
                    namespace: "config"
                }, function(err, configSync) {
                    getFs({
                        packagePath: "fs/union",
                        fileSystems: [configSync, configStatic],
                        watchSelf: watchSelf
                    }, function(err, fs) {
                        register(err, {
                            fs: fs
                        });
                    });
                });
            });
        }
    }

    // Creates local architect application with just the file system module
    function getFs(config, callback) {
        architect.resolveConfig([config, "./history.chrome"], function(err, config) {
            if (err) {
                return callback(err);
            }
            architect.createApp(config, function(err, app) {
                if (err) {
                    return callback(err);
                }
                callback(null, app.getService("fs"));
            });
        });
    }
});
