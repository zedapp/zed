/*global _ $ ace */
require.config({
    baseUrl: "js",
    paths: {
        "text": "../dep/text",
        "async": "../config/api/zed/lib/async"
    },
});

/* global ace, $, _ */
require(["text!../manual/intro.md"], function(introText) {
    "use strict";

    var modules = [
        "./command",
        "./editor",
        "./editbar",
        "./contextbar",
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
        "./log"];
    require(modules, function() {

        setupBuiltinDoc("zed::start", introText);
        setupBuiltinDoc("zed::log", "Zed Log\n===========\n");


        _.each(arguments, function(module) {
            if (module.hook) module.hook();
        });


        _.each(arguments, function(module) {
            if (module.init) module.init();
        });
        
                console.log("Zed booted.");

        function setupBuiltinDoc(path, text) {
            var session_manager = require("./session_manager");
            var editor = require("./editor");
            var eventbus = require("./lib/eventbus");
            
            var session = editor.createSession(path, text);
            session.readOnly = true;
            
            eventbus.on("modesloaded", function modesLoaded(modes) {
                if(modes.get("markdown")) {
                    modes.setSessionMode(session, "markdown");
                    eventbus.removeListener("modesloaded", modesLoaded);
                }
            });
            
            session_manager.specialDocs[path] = session;
        }
    });
});