/*global define, _ */
define(function(require, exports, module) {
    var eventbus = require("./lib/eventbus");
    var config = require("./config");
    var command = require("./command");

    /**
     * This parts handles mode events, e.g. "change", "preview" etc.
     */

    var eventHandlerFn;
    var lastEventPath;

    function triggerSessionCommandEvent(session, eventname, debounceTimeout) {
        var path = session.filename;
        var mode = session.mode;
        var commandNames = [];

        if (mode && mode.events[eventname]) {
            commandNames = commandNames.concat(mode.events[eventname]);
        }
        if (config.getEvents()[eventname]) {
            commandNames = commandNames.concat(config.getEvents()[eventname]);
        }

        function runCommands() {
            require(["./editor"], function(editor) {
                var edit = editor.getActiveEditor();
                commandNames.forEach(function(commandName) {
                    command.exec(commandName, edit, session);
                });
            });
        }

        if (commandNames.length > 0) {
            if (debounceTimeout) {
                if (path !== lastEventPath) {
                    eventHandlerFn = _.debounce(runCommands, debounceTimeout);
                    lastEventPath = path;
                }
                eventHandlerFn();
            } else {
                runCommands();
            }
        }

        return commandNames.length > 0;
    }

    exports.hook = function() {
        eventbus.on("sessionchanged", function(session) {
            triggerSessionCommandEvent(session, "change", 1000);
        });
        eventbus.on("modeset", function(session) {
            triggerSessionCommandEvent(session, "change");
        });

        eventbus.on("preview", function(session) {
            var didPreview = triggerSessionCommandEvent(session, "preview");
            if (!didPreview) {
                require(["./preview"], function(preview) {
                    preview.showPreview("Not supported.");
                    eventbus.emit("sessionactivityfailed", session, "No preview available");
                });
            }
        });
    };
});