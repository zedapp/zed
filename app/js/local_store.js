/*global define, _, nodeRequire */
define(function(require, exports, module) {
    plugin.consumes = [];
    plugin.provides = ["local_store"];
    return plugin;

    function plugin(options, imports, register) {
        var api;
        if(window.isNodeWebkit) {
            api = require("./local_store.nw")();
        } else {
            api = require("./local_store.chrome")();
        }
        register(null, {
            local_store: api
        });
    }
});
