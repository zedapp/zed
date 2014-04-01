/*global define, chrome, nodeRequire */
define(function(require, exports, module) {
    var architect = require("../../dep/architect");
    plugin.provides = ["fs"];
    return plugin;

    function plugin(options, imports, register) {
        var watchSelf = options.watchSelf;

        var fs = nodeRequire("fs");

        staticFs(function(err, configStatic) {
            var configHome = process.env.HOME + "/.zed";
            if (!fs.existsSync(configHome)) {
                fs.mkdirSync(configHome);
            }
            getFs({
                packagePath: "fs/node",
                dir: configHome
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

        function staticFs(callback) {
            getFs({
                packagePath: "fs/static",
                url: "config",
                readOnlyFn: function(path) {
                    return path !== "/.zedstate" && path !== "/user.json" && path !== "/user.css";
                }
            }, callback);
        }
    }

    // Creates local architect application with just the file system module
    function getFs(config, callback) {
        architect.resolveConfig([config, "./history.nw"], function(err, config) {
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
