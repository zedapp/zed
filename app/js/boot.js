/*global _ $ ace */
require.config({
    baseUrl: "js",
    paths: {
        "text": "../dep/text",
        "async": "../dep/async"
    },
});

/* global ace, $, _ */
require(["text!../manual/cheatsheet.md"], function(cheatsheet) {
    "use strict";

    var useragent = ace.require("ace/lib/useragent");

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
        "./handlers"
    ];
    require(modules, function() {
        var session_manager = require("./session_manager");

        if (!useragent.isMac) {
            $("body").addClass("non_mac");
        }

        session_manager.specialDocs['zed:start'] = {
            mode: 'ace/mode/markdown',
            content: cheatsheet
        };

        _.each(arguments, function(module) {
            if (module.hook) module.hook();
        });
        
        
        _.each(arguments, function(module) {
            if (module.init) module.init();
        });

        console.log("Zed booted.");
    });
});