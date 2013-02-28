define(function(require, exports, module) {
    var events = require("events");
    plugin.provides = ['eventbus'];
    return plugin;

    function plugin(options, imports, register) {
        register(null, {
            eventbus: new events.EventEmitter()
        });
    }
});
