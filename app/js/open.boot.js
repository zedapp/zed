/*global _ $ ace */
require.config({
    baseUrl: "js",
    paths: {
        "text": "../dep/text",
        "events": "./lib/emitter"
    },
});

/* global ace, $, _ */
require(["../dep/architect"], function(architect) {
    "use strict";
    var modules = [
        "./history",
        "./open",
        "./config",
        "./eventbus",
        "./command",
        "./sandbox",
        "./keys",
        "./configfs"];


    architect.resolveConfig(modules, function(err, config) {
        if (err) {
            return console.error("Architect resolve error", err);
        }
        architect.createApp(config, function(err, app) {
            if (err) {
                window.err = err;
                return console.error("Architect createApp error", err, err.stack);
            }
            window.zed = app;

            // Run hook on each service (if exposed)
            _.each(app.services, function(service) {
                if (service.hook) {
                    service.hook();
                }
            });
            // Run init on each service (if exposed)
            _.each(app.services, function(service) {
                if (service.init) {
                    service.init();
                }
            });
        });
    });
});
