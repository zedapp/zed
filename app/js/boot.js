/*global _ $ ace */
require.config({
    baseUrl: "js",
    paths: {
        "text": "../dep/text"
    },
});

require(["text!../manual/cheatsheet.md"], function(manual) {
    "use strict";

    var useragent = ace.require("ace/lib/useragent");

    var modules = [
        "./command",
        "./editor",
        "./editbar",
        "./contextbar",
        "./settings",
        "./goto",
        "./sandbox",
        "./tree",
        "./state",
        "./project",
        "./keys",
        "./complete",
        "./modes",
        "./split",
        "./window",
        "./file",
        "./session_manager",
        "./tool/beautify",
        "./tool/check",
        "./tool/preview",
        "./tool/ctags"];
    require(modules, function() {
        var session_manager = require("./session_manager");

        if (!useragent.isMac) {
            $("body").addClass("non_mac");
        }

        session_manager.specialDocs['zed:start'] = {
            mode: 'ace/mode/markdown',
            content: manual
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