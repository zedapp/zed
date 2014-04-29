/* global ace, $, _ */
require.config({
    baseUrl: "js",
    paths: {
        "text": "../dep/text",
        "events": "./lib/emitter"
    },
});

window.isNodeWebkit = typeof window.chrome === "undefined";

require(["../dep/architect"], function(architect) {
    "use strict";

    var builtinProjects;

    var modules = ["./config",
        "./eventbus",
        "./command",
        "./keys"];

    if (window.isNodeWebkit) {
        modules.push("./history.nw", "./configfs.nw", "./window.nw", "./sandbox.nw", "./cli.nw", "./windows.nw", "./auto_update.nw");
        modules.push({
            packagePath: "./open",
            editorHtml: "editor.nw.html",
            builtinProjects: [{
                name: "Open Local Folder",
                url: "node:"
            }, {
                name: "Configuration",
                url: "nwconfig:"
            }, {
                name: "Manual",
                url: "manual:"
            }]
        });
    } else {
        modules.push("./history.chrome", "./configfs.chrome", "./window.chrome", "./sandbox.chrome", "./windows.chrome");
        modules.push({
            packagePath: "./open",
            editorHtml: "editor.html",
            builtinProjects: [{
                name: "Open Local Folder",
                url: "local:"
            }, {
                id: "dropbox-open",
                name: "Open Dropbox Folder",
                url: "dropbox:"
            }, {
                name: "Notes",
                url: "syncfs:",
            }, {
                name: "Configuration",
                url: "config:"
            }, {
                name: "Manual",
                url: "manual:"
            }]
        });
    }


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

            try {
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

            } catch(e) {
                console.error("Error hooking or initing:", e);
            }

        });
    });
});
