/*global define, chrome, nodeRequire */
define(function(require, exports, module) {
    var fs = nodeRequire("fs");
    var architect = require("../../dep/architect");
    plugin.provides = ["fs"];
    return plugin;

    function plugin(options, imports, register) {
        var watchSelf = options.watchSelf;

        var gui = nodeRequire('nw.gui');

        var configStatic;

        staticFs().then(function(configStatic_) {
            configStatic = configStatic_;
            var configHome = localStorage.configDir || (gui.App.dataPath + "/config");
            console.log("Config home", configHome);
            if (!fs.existsSync(configHome)) {
                fs.mkdirSync(configHome);
            }
            return getFs({
                packagePath: "fs/node",
                dir: configHome,
                dontRegister: true
            });
        }).then(function(configLocal) {
            console.log("File systems for config", configLocal, configStatic);
            return getFs({
                packagePath: "fs/union",
                fileSystems: [configLocal, configStatic],
                watchSelf: watchSelf,
            });
        }).then(function(fs) {
            register(null, {
                fs: fs
            });
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
    }

    // Creates local architect application with just the file system module
    function getFs(config) {
        return new Promise(function(resolve, reject) {
            architect.resolveConfig([config, "./history.nw"], function(err, config) {
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
