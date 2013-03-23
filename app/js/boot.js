require.config({
    baseUrl: "js",
    paths: {
        "text": "../dep/text"
    },
});

require(["text!../manual/cheatsheet.md"], function(manual) {
    "use strict";
    
    var modules = [
        "./command",
        "./editor",
        "./editbar",
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
        "./session_manager",
        "./tool/beautify",
        "./tool/check",
        "./tool/preview",
        "./tool/compile"
    ];
    require(modules, function() {
        var session_manager = require("./session_manager");

        session_manager.specialDocs['zed:start'] = {
            mode: 'ace/mode/markdown',
            content: manual
        };

        var pluginModules = Array.prototype.slice.call(arguments);
        pluginModules.forEach(function(module) {
            if (module.hook) module.hook();
        });
        pluginModules.forEach(function(module) {
            if (module.init) module.init();
        });

        console.log("Zed loaded.");
    });

});