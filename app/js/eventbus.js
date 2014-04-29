/*global define*/
define(function(require, exports, module) {
    plugin.provides = ["eventbus"];
    return plugin;

    function plugin(options, imports, register) {
        var events = require("./lib/events");
        var api = new events.EventEmitter(false);

        window.eventbus = api;
        register(null, {
            eventbus: api
        });
    }

});
