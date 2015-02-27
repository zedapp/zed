define(function(require, exports, module) {
    plugin.provides = ["history"];
    return plugin;

    function plugin(options, imports, register) {
        var api;
        if(window.isNodeWebkit) {
            api = require("./history.nw")();
        } else {
            api = require("./history.chrome")();
        }
        register(null, {
            history: api
        });
    }
});
