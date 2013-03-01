require(["plugins", "jquery"], function(plugins, eventbus) {
    function loadCSS(url) {
        $("head").append('<link href="' + url + '" rel="stylesheet" type="text/css">');
    }

    loadCSS("lib/app.css");

    require(plugins, function() {

        var config = require("config");
        var eventbus = require("eventbus");

        var hash = location.hash;
        if(!hash) {
            location.hash = "#" + prompt("URL:");
            hash = location.hash;
        }
        config.set('url', hash.substr(1));
        eventbus.emit("pathchange");
        setInterval(function() {
            if(location.hash !== hash) {
                hash = location.hash;
                config.set('url', location.hash.substr(1));
                eventbus.emit("pathchange");
            }
        }, 1000);
        console.log("Zedit loaded.");
    });

});
