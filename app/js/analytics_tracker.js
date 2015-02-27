define(function(require, exports, module) {
    plugin.consumes = ["config"];
    plugin.provides = ["analytics_tracker"];
    return plugin;

    function plugin(options, imports, register) {
        var apiProm;
        if(window.isNodeWebkit) {
            apiProm = require("./analytics_tracker.nw")(imports.config);
        } else {
            apiProm = require("./analytics_tracker.chrome")(imports.config);
        }
        apiProm.then(function(api) {
            register(null, {
                analytics_tracker: api
            });
        });
    }
});
