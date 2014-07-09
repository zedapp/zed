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
                staticFs().then(function(configStatic) {
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
                        }).then(function(configLocal) {
                            getFs({
                                packagePath: "fs/union",
                                fileSystems: [configLocal, configStatic],
                                watchSelf: watchSelf
                            }).then(function(fs) {
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

        function staticFs() {
            return getFs({
                packagePath: "fs/static",
                url: "config",
                readOnlyFn: function(path) {
                    return path !== "/.zedstate" && path !== "/user.json" && path !== "/user.css";
                }
            });
        }

        function syncConfig() {
            var configStatic;
            staticFs().then(function(configStatic_) {
                configStatic = configStatic_;
                return getFs({
                    packagePath: "./fs/sync",
                    namespace: "config"
                });
            }).then(function(configSync) {
                return getFs({
                    packagePath: "fs/union",
                    fileSystems: [configSync, configStatic],
                    watchSelf: watchSelf
                });
            }).then(function(fs) {
                register(null, {
                    fs: fs
                });
            }, function(err) {
                register(err);
            });
        }
    }

    // Creates local architect application with just the file system module
    function getFs(config) {
        return new Promise(function(resolve, reject) {
            architect.resolveConfig([config, "./history.chrome"], function(err, config) {
                if (err) {
                    return reject(err);
                }
                architect.createApp(config, function(err, app) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(app.getService("fs"));
                });
            });
        });
    }
});
