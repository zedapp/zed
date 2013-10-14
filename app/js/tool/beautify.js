/*global define */
define(function(require, exports, module) {
    var eventbus = require("../lib/eventbus");
    var editor = require("../editor");
    var command = require("../command");
    var tools = require("../tools");

    function beautify(session) {
        eventbus.emit("sessionactivitystarted", session, "Beautifying");
        tools.run(session, "beautify", {}, function(err) {
            if(err) {
                eventbus.emit("sessionactivityfailed", session, err);
            } else {
                eventbus.emit("sessionactivitycompleted", session);
            }
        });
    }

    command.define("Tools:Beautify", {
        exec: function(edit) {
            beautify(edit.getSession());
        }
    });
});
