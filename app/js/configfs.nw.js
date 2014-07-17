/*global define, zed, nodeRequire */
define(function(require, exports, module) {
    var architect = require("../dep/architect");
    plugin.consumes = ["command"];
    plugin.provides = ["configfs"];
    return plugin;

    function plugin(options, imports, register) {
        var folderPicker = require("./lib/folderpicker.nw");
        var command = imports.command;
        // Let's instaiate a new architect app with a configfs and the re-expose
        // that service as configfs
        architect.resolveConfig([{
            packagePath: "./fs/config.nw",
            watchSelf: true
        }], function(err, config) {
            if (err) {
                return register(err);
            }
            architect.createApp(config, function(err, app) {
                if (err) {
                    return register(err);
                }
                register(null, {
                    configfs: app.getService("fs")
                });
            });
        });

        command.define("Configuration:Set Configuration Directory", {
            doc: "Choose which directory Zed should store it's configuration in.",
            exec: function() {
                folderPicker().then(function(path) {
                    localStorage.configDir = path;
                    zed.getService("ui").prompt({
                        message: "Configuration location set, will now exit Zed. Please restart for the changes to take effect."
                    }).then(function() {
                        var gui = nodeRequire('nw.gui');
                        gui.App.quit();
                    });
                });
            },
            readOnly: true
        });
    }
});
