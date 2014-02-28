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
        "./fix",
        "./theme"
    ];
    require(modules, function() {
        var session_manager = require("./session_manager");

        session_manager.specialDocs['zed::start'] = {
            mode: 'ace/mode/markdown',
            content: introText
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