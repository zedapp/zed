require.config({
    baseUrl: "lib",
    waitSeconds: 15
});

require(["plugins", "text!../manual.md"], function(plugins, manual) {
    require(plugins, function() {
        var state = require("state");
        var eventbus = require("eventbus");
        var session_manager = require("session_manager");

        session_manager.specialDocs['zed:start'] = {
            mode: 'ace/mode/markdown',
            content: manual
        };
        
        var pluginModules = Array.prototype.slice.call(arguments);
        pluginModules.forEach(function(module) {
            if(module.hook)
                module.hook();
        });
        pluginModules.forEach(function(module) {
            if(module.init)
                module.init();
        });
        
        console.log("Zed loaded.");
    });

});
