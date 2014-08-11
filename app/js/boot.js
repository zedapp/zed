/*global _ $ ace */
require.config({
    baseUrl: "js",
    paths: {
        "text": "../dep/text",
        "json5": "../dep/json5",
        "zedb": "../dep/zedb",
        "async": "../config/api/zed/lib/async",
        "events": "./lib/emitter"
    },
});

window.isNodeWebkit = typeof window.chrome === "undefined";

/* global ace, $, _ */
require(["../dep/architect", "./lib/options", "./fs_picker", "text!../manual/intro.md"], function(architect, options, fsPicker, introText) {
    "use strict";

    var modules = [
        "./eventbus",
        "./ui",
        "./command",
        "./editor",
        "./title_bar",
        "./symbol",
        "./config",
        "./goto",
        "./tree",
        "./state",
        "./project",
        "./keys",
        "./complete",
        "./session_manager",
        "./modes",
        "./split",
        "./file",
        "./preview",
        "./dnd",
        "./handlers",
        "./action",
        "./theme",
        "./log",
        "./window_commands",
        "./analytics",
        "./menu",
        "./db",
        "./webservers"];

    if (window.isNodeWebkit) {
        modules.push("./configfs.nw", "./window.nw", "./history.nw", "./sandbox.nw", "./windows.nw", "./mac_cli_command.nw", "./analytics_tracker.nw", "./webserver.nw");
    } else {
        modules.push("./configfs.chrome", "./window.chrome", "./history.chrome", "./sandbox.chrome", "./windows.chrome", "./analytics_tracker.chrome", "./webserver.chrome");
    }

    fsPicker().then(function(fsConfig) {
        modules.push(fsConfig);
        console.log("Fs config", fsConfig);
        architect.resolveConfig(modules, function(err, config) {
            if (err) {
                return console.error("Architect resolve error", err);
            }
            console.log("Architect resolved");
            var app = architect.createApp(config, function(err, app) {
                if (err) {
                    window.err = err;
                    return console.error("Architect createApp error", err, err.stack);
                }
                console.log("App started");
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

                app.getService("analytics_tracker").trackEvent("Editor", "FsTypeOpened", options.get("url").split(":")[0]);

                setupBuiltinDoc("zed::start", introText);
                setupBuiltinDoc("zed::log", "Zed Log\n===========\n");

                function setupBuiltinDoc(path, text) {
                    var session_manager = app.getService("session_manager");
                    var editor = app.getService("editor");
                    var eventbus = app.getService("eventbus");

                    var session = editor.createSession(path, text);
                    session.readOnly = true;

                    eventbus.on("modesloaded", function modesLoaded(modes) {
                        if (modes.get("markdown")) {
                            modes.setSessionMode(session, "markdown");
                            eventbus.removeListener("modesloaded", modesLoaded);
                        }
                    });

                    session_manager.specialDocs[path] = session;
                }
            });

            app.on("service", function(name) {
                console.log("Loaded " + name);
            });
        });
    });
});
