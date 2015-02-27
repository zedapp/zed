define(function(require, exports, module) {
    plugin.consumes = ["eventbus", "background", "command"];
    plugin.provides = ["window"];
    return plugin;

    function plugin(options, imports, register) {
        var api;
        if(window.isNodeWebkit) {
            api = require("./window.nw")(imports.command, imports.background);
        } else {
            api = require("./window.chrome")(imports.eventbus, imports.background);
        }
        register(null, {
            window: api
        });
    }
});
