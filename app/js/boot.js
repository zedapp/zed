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

    var baseModules = [
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
        "./webservers",
        "./version_control"];

    // if (!options.get("url")) {
    //     baseModules = [
    //         "./eventbus",
    //         // "./ui",
    //         "./title_bar",
    //         "./config",
    //         "./theme",
    //         "./window_commands",
    //         "./analytics", {
    //         provides: ["editor", "command", "session_manager"],
    //         consumes: [],
    //         setup: function(options, imports, register) {
    //             register(null, {
    //                 editor: {},
    //                 command: {
    //                     define: function() {}
    //                 },
    //                 session_manager: {}
    //             });
    //         }
    //     }];
    // }
    if (window.isNodeWebkit) {
        baseModules.push("./configfs.nw", "./window.nw", "./history.nw", "./sandbox.nw", "./windows.nw", "./mac_cli_command.nw", "./analytics_tracker.nw", "./webserver.nw", "./token_store.nw", "./background.nw");
    } else {
        baseModules.push("./configfs.chrome", "./window.chrome", "./history.chrome", "./sandbox.chrome", "./windows.chrome", "./analytics_tracker.chrome", "./webserver.chrome", "./token_store.chrome", "./background.chrome");
    }

    // require("ace/editor").Editor.prototype.focus = function() {
    //     console.log("Asked to focus editor!");
    //     console.trace();
    // }


    if (options.get("url")) {
        openUrl(options.get("url"));
    } else {
        projectPicker();
    }

    function projectPicker() {
        var modules = baseModules.slice();
        modules.push("./fs/empty");
        modules.push("./open_ui");
        boot(modules, false);
    }

    window.projectPicker = projectPicker;

    function openUrl(url) {
        fsPicker(url).then(function(fsConfig) {
            var modules = baseModules.slice();
            modules.push(fsConfig);
            boot(modules, true);
        });
    }


    function boot(modules, bootEditor) {
        $("div").remove();
        $("span").remove();
        $("webview").remove();
        $("body").append("<img src='/Icon.png' id='wait-logo'>");
        // return;
        return new Promise(function(resolve, reject) {
            architect.resolveConfig(modules, function(err, config) {
                if (err) {
                    console.error("Architect resolve error", err);
                    return reject(err);
                }
                console.log("Architect resolved");
                var app = architect.createApp(config, function(err, app) {
                    if (err) {
                        window.err = err;
                        return console.error("Architect createApp error", err, err.stack);
                    }
                    $("#wait-logo").remove();
                    try {
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

                        if (bootEditor) {
                            app.getService("analytics_tracker").trackEvent("Editor", "FsTypeOpened", options.get("url").split(":")[0]);

                            setupBuiltinDoc("zed::start", introText);
                            setupBuiltinDoc("zed::log", "Zed Log\n===========\n");

                        } else {
                            app.getService("eventbus").on("urlchanged", function() {
                                openUrl(options.get("url"));
                            });
                        }

                        console.log("App started");
                        resolve(app);
                    } catch (e) {
                        console.error("Error booting", e);
                        reject(e);
                    }

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
    }
});
