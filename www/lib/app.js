require(["plugins"], function(plugins) {
    function loadCSS(url) {
        $("head").append('<link href="' + url + '" rel="stylesheet" type="text/css">');
    }

    loadCSS("lib/app.css");

    require(plugins, function() {
        var config = require("config");
        var eventbus = require("eventbus");
        var session_manager = require("session_manager");

        var hash = location.hash;
        if(!hash) {
            location.hash = "#" + prompt("URL:");
            hash = location.hash;
        }
        config.set('url', hash.substr(1));
        setInterval(function() {
            if(location.hash !== hash) {
                hash = location.hash;
                config.set('url', location.hash.substr(1));
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
