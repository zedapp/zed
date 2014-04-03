/*global define, chrome */
define(function(require, exports, module) {
    var architect = require("../dep/architect");
    plugin.provides = ["configfs"];
    return plugin;

    function plugin(options, imports, register) {
        // Let's instaiate a new architect app with a configfs and the re-expose
        // that service as configfs
        architect.resolveConfig([{
            packagePath: "./fs/config.chrome",
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
    }
});
