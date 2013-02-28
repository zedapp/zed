require(["jquery", "architect"], function ($, architect) {
    architect.resolveConfig([
        "plugins/goto",
        "plugins/config",
        "plugins/keys",
        "plugins/eventbus",
        "plugins/io",
        "plugins/session_manager",
        "plugins/ace",
    ], function (err, config) {
        if (err) throw err;
        architect.createApp(config, function(err, app) {
            window.app = app;
            var hash = location.hash;
            if(!hash) {
                location.hash = "#" + prompt("URL:");
                hash = location.hash;
            }
            app.getService("config").set('url', location.hash.substr(1));
            app.getService("eventbus").emit("pathchange");

            setInterval(function() {
                if(location.hash !== hash) {
                    hash = location.hash;
                    app.getService("config").set('url', location.hash.substr(1));
                    app.getService("eventbus").emit("pathchange");
                }
            }, 1000);
            console.log("Zedit loaded.");
        });
    });
        
});
