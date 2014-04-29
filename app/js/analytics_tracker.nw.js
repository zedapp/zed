/*global analytics*/
define(function(require, exports, module) {
    "use strict";
    plugin.consumes = ["config"];
    plugin.provides = ["analytics_tracker"];
    return plugin;

    function plugin(options, imports, register) {
        var config = imports.config;

        var request = nodeRequire("request");
        if(!localStorage.analyticsId) {
            localStorage.analyticsId = "" + Date.now();
        }

        getCurrentVersion(function(err, version) {
            var api = {
                trackEvent: function(category, name, label) {
                    if (config.getPreference("enableAnalytics") !== false) {
                        request({
                            uri: "https://www.google-analytics.com/collect",
                            method: 'POST',
                            body: "t=event&_v=ca3&v=1&an=zed&av=" + version + "&tid=UA-58112-11&ul=en-US&ec=" + encodeURIComponent(category) + "&ea=" + encodeURIComponent(name) + "&el=" + encodeURIComponent(label) + "&cid=" + localStorage.analyticsId
                        }, function(err) {
                            if(err) {
                                console.error("GA error", err);
                            }
                        });
                    }
                }
            };

            register(null, {
                analytics_tracker: api
            });
        });
    }

    function getCurrentVersion(callback) {
        $.get("app://./manifest.json", function(text) {
            var json = JSON.parse(text);
            callback(null, json.version + "-nw");
        }).error(function(err) {
            callback(err);
        });
    }
});
