require.config({
    baseUrl: "lib",
    waitSeconds: 15
});

require(["plugins"], function(plugins) {
    require(plugins, function() {
        var state = require("state");
        var eventbus = require("eventbus");
        var session_manager = require("session_manager");

        eventbus.declare("pathchange");

        var pluginModules = Array.prototype.slice.call(arguments);
        pluginModules.forEach(function(module) {
            if(module.hook)
                module.hook();
        });
        pluginModules.forEach(function(module) {
            if(module.init)
                module.init();
        });
        
        var hash = location.hash;
        if(!hash) {
            location.hash = "#http://localhost:8080/server/php/?/fabedit";//; + prompt("URL:");
            hash = location.hash;
        }
        state.set('url', hash.substr(1));
        setInterval(function() {
            if(location.hash !== hash) {
                hash = location.hash;
                state.set('url', location.hash.substr(1));
                eventbus.emit("pathchange");
            }
        }, 1000);

        $.get("manual.md", function(res) {
            session_manager.specialDocs['zed:start'] = {
                mode: 'ace/mode/markdown',
                content: res
            };
            eventbus.emit("pathchange");
        }, 'text');

        console.log("Zed loaded.");
    });

});
