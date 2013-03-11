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
        
        var url = location.hash.substring(1);
        if(!url) {
            alert("URL should end with #http://project.url...");
            return;
        }
        var hash = location.hash;
        setInterval(function() {
            if(location.hash !== hash) {
                location.reload();
            }
        }, 1000);
        
        


        console.log("Zed loaded.");
    });

});
