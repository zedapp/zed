/*global define, zed, nodeRequire, architect */
define(function(require, exports, module) {
    return function(command) {
        var folderPicker = require("./lib/folderpicker.nw");
        var fsUtil = require("./fs/util");
        var architect = require("../dep/architect");

        var queueFs = fsUtil.queuedFilesystem();

        // Let's instaiate a new architect app with a configfs and the re-expose
        // that service as configfs
        architect.resolveConfig([{
            packagePath: "./fs/config.nw",
            watchSelf: true
        }], function(err, config) {
            if (err) {
                return console.error("Error", err);
            }
            architect.createApp(config, function(err, app) {
                if (err) {
                    return console.error("Error", err);
                }
                try {
                    queueFs.resolve(app.getService("fs"));
                } catch (e) {
                    console.error("Couldn't resolve fs", e);
                }
            });
        });

        queueFs.storeLocalFolder = function() {
            return zed.getService("ui").prompt({
                message: "Do you want to pick a folder to store Zed's configuration in?"
            }).then(function(yes) {
                if (yes) {
                    return folderPicker().then(function(path) {
                        localStorage.configDir = path;
                        return zed.getService("ui").prompt({
                            message: "Configuration location set, will now exit Zed. Please restart for the changes to take effect."
                        }).then(function() {
                            var gui = nodeRequire('nw.gui');
                            gui.App.quit();
                        });
                    });
                }
            });
        };

        command.define("Configuration:Set Configuration Directory", {
            doc: "Choose which directory Zed should store it's configuration in.",
            exec: function() {
                queueFs.storeLocalFolder();
            },
            readOnly: true
        });

        return queueFs;
    };
});
