define(function(require, exports, module) {
    plugin.consumes = ["command"];
    plugin.provides = ["configfs"];
    return plugin;

    function plugin(options, imports, register) {
        var api;
        if(window.isNodeWebkit) {
            api = require("./configfs.nw")(imports.command);
        } else {
            api = require("./configfs.chrome")(imports.command);
        }
        register(null, {
            configfs: api
        });
    }
});
