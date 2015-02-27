/*global analytics*/
define(function(require, exports, module) {
    return function(config) {
        var service = analytics.getService("zed");
        var tracker = service.getTracker("UA-58112-11");

        var api = {
            trackEvent: function(category, name, label) {
                if(config.getPreference("enableAnalytics") !== false) {
                    tracker.sendEvent(category, name, label);
                }
            }
        };

        return Promise.resolve(api);
    };
});
