define(function(require, exports, module) {
    plugin.provides = ["sandbox"];
    return plugin;

    function plugin(options, imports, register) {
        var api;
        if(window.isNodeWebkit) {
            api = require("./sandbox.nw")();
        } else {
            api = require("./sandbox.chrome")();
        }
        register(null, {
            sandbox: api
        });
    }
});
