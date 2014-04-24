/*global analytics*/
define(function(require, exports, module) {
    "use strict";
    plugin.consumes = ["config"];
    plugin.provides = ["analytics_tracker"];
    return plugin;

    function plugin(options, imports, register) {
        var config = imports.config;

        var service = analytics.getService("zed");
        var tracker = service.getTracker("UA-58112-11");

        var api = {
            trackEvent: function(category, name, label) {
                if(config.getPreference("enableAnalytics") !== false) {
                    tracker.sendEvent(category, name, label);
                }
            }
        };

        register(null, {
            analytics_tracker: api
        });

    }
});
