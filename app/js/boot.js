/*global _ $ ace */
require.config({
    baseUrl: "js",
    paths: {
        "text": "../dep/text",
        "async": "../config/api/zed/lib/async",
        "events": "./lib/emitter"
    },
});

/* global ace, $, _ */
require(["../dep/architect", "./lib/options", "./fs_picker", "text!../manual/intro.md"], function(architect, options, fsPicker, introText) {
    "use strict";
    var modules = [
        "./eventbus",
        "./ui",
        "./command",
        "./window",
        "./editor",
        "./title_bar",
        "./ctags",
        "./config",
        "./goto",
        "./sandbox",
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
        "./configfs"];


    fsPicker(function(err, fsConfig) {
        if (err) {
            return console.error("Fs picker error", err);
        }
        modules.push(fsConfig);
        console.log("Fs config", fsConfig);
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
        });
    });
});
