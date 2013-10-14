/*global define*/
define(function(require, exports, module) {
    var eventbus = require("../lib/eventbus");
    var tools = require("../tools");

    var defaultTimeout = 1000;
    var minTimeout = 500;
    var timeOuts = {};

    function check(session) {
        var path = session.filename;
        var before = Date.now();
        tools.run(session, "check", {}, function(err) {
            if(err) {
                return;
            }
            timeOuts[path] = Math.max(minTimeout, (Date.now() - before) * 3);
        });
    }

    exports.hook = function() {
        var changeTimer = null;
        eventbus.on("sessionchanged", function(session) {
            if (changeTimer)
                clearTimeout(changeTimer);
            changeTimer = setTimeout(function() {
                check(session);
            }, timeOuts[session.filename] || defaultTimeout);
        });
        eventbus.on("modeset", function(session) {
            check(session);
        });
    };
});
