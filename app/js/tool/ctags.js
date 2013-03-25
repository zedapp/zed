/*global define*/
define(function(require, exports, module) {
    var eventbus = require("../lib/eventbus");
    var tools = require("../tools");
    var ctags = require("../ctags");
    
    var defaultTimeout = 2500;
    var minTimeout = 1000;
    var timeOuts = {};
    
    function index(session) {
        var path = session.filename;
        if(!path) {
            return;
        }
        var before = Date.now();
        tools.run(session, "ctags", {}, session.getValue(), function(err, tags) {
            if(err) {
                return;
            }
            timeOuts[path] = Math.max(minTimeout, (Date.now() - before) * 3);
            if(typeof tags === "string") {
                try {
                    tags = JSON.parse(tags);
                } catch(e) {
                    return console.error("Could not parse ctags:", tags);
                }
            }
            tags.forEach(function(tag) {
                tag.path = path;
            });
            ctags.updateCTags(path, tags);
        });
    }
    
    exports.hook = function() {
        var changeTimer = null;
        eventbus.on("sessionchanged", function(session) {
            if (changeTimer)
                clearTimeout(changeTimer);
            changeTimer = setTimeout(function() {
                index(session);
            }, timeOuts[session.filename] || defaultTimeout);
        });
        eventbus.on("modeset", function(session) {
            index(session);
        });
    };
});
