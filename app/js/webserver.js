define(function(require, exports, module) {
    plugin.provides = ["webserver"];
    return plugin;

    function plugin(options, imports, register) {
        var api;
        if(window.isNodeWebkit) {
            api = require("./webserver.nw")();
        } else {
            api = require("./webserver.chrome")();
        }
        register(null, {
            webserver: api
        });
    }
});
