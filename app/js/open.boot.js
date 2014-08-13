/* global ace, $, _ */
require.config({
    baseUrl: "js",
    paths: {
        "text": "../dep/text",
        "events": "./lib/emitter",
        "zedb": "../dep/zedb"
    },
});

window.isNodeWebkit = typeof window.chrome === "undefined";

require(["../dep/architect", "zedb"], function(architect, zedb) {
    "use strict";

    var modules = ["./config",
        "./eventbus",
        "./command",
        "./keys"];

    if (window.isNodeWebkit) {
        modules.push("./history.nw", "./configfs.nw", "./window.nw", "./sandbox.nw", "./cli.nw", "./windows.nw", "./auto_update.nw", "./analytics_tracker.nw", "./token_store.nw");
        modules.push({
            packagePath: "./open",
            editorHtml: "editor.nw.html",
            builtinProjects: [{
                name: "Open Local Folder",
                url: "node:"
            }, {
                id: "github-open",
                name: "Open Github Repository",
                url: "gh:"
            }, {
                name: "Configuration",
                url: "nwconfig:"
            }, {
                name: "Manual",
                url: "manual:"
            }]
        });
    } else {
        modules.push("./history.chrome", "./configfs.chrome", "./window.chrome", "./sandbox.chrome", "./windows.chrome", "./analytics_tracker.chrome", "./token_store.chrome");
        modules.push({
            packagePath: "./open",
            editorHtml: "editor.html",
            builtinProjects: [{
                name: "Open Local Folder",
                url: "local:"
            }, {
                id: "github-open",
                name: "Open Github Repository",
                url: "gh:"
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

    dbGarbageCollect();

    architect.resolveConfig(modules, function(err, config) {
        if (err) {
            return console.error("Architect resolve error", err);
        }
        var app = architect.createApp(config, function(err, app) {
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

            } catch (e) {
                console.error("Error hooking or initing:", e);
            }
        });
        app.on("service", function(name) {
            console.log("Loaded " + name);
        });
    });

    function dbGarbageCollect() {
        var age = 1000 * 60 * 60 * 24 * 14; // 2 weeks
        zedb.list().then(function(dbNames) {
            _.each(dbNames, function(dbName) {
                zedb.open(dbName, 1, null).then(function(db) {
                    if (db.getObjectStoreNames().contains("_meta")) {
                        db.readStore("_meta").get("meta").then(function(meta) {
                            if (meta.lastUse < Date.now() - age) {
                                console.log("Deleting", dbName, "since it is old");
                                db.close();
                                zedb.delete(dbName);
                            }
                        });
                    }
                });
            });
        });
    }
});
