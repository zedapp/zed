define(function(require, exports, module) {
    plugin.provides = ["windows"];
    return plugin;

    function plugin(options, imports, register) {
        var apiProm;
        if(window.isNodeWebkit) {
            apiProm = require("./windows.nw")();
        } else {
            apiProm = require("./windows.chrome")();
        }
        apiProm.then(function(api) {
            register(null, {
                windows: api
            });
        });
    }
});
