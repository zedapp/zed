/*global define, _ */
define(function(require, exports, module) {
    var eventbus = require("./lib/eventbus");
    var config = require("./config");
    var command = require("./command");

    /**
     * This parts handles mode handlers, e.g. "change", "preview" etc.
     */

    var handlerFn;
    var lastHandlerPath;

    function runSessionHandler(session, handlerName, debounceTimeout) {
        var path = session.filename;
        var mode = session.mode;
        var commandNames = [];

        if (mode && mode.handlers[handlerName]) {
            commandNames = commandNames.concat(mode.handlers[handlerName]);
        }
        if (config.getHandlers()[handlerName]) {
            commandNames = commandNames.concat(config.getHandlers()[handlerName]);
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
                if (path !== lastHandlerPath) {
                    handlerFn = _.debounce(runCommands, debounceTimeout);
                    lastHandlerPath = path;
                }
                handlerFn();
            } else {
                runCommands();
            }
        }

        return commandNames.length > 0;
    }

    exports.hook = function() {
        eventbus.on("sessionchanged", function(session) {
            runSessionHandler(session, "change", 1000);
        });
        eventbus.on("modeset", function(session) {
            runSessionHandler(session, "change");
        });

        eventbus.on("preview", function(session) {
            var didPreview = runSessionHandler(session, "preview");
            if (!didPreview) {
                require(["./preview"], function(preview) {
                    preview.showPreview("Not supported.");
                    eventbus.emit("sessionactivityfailed", session, "No preview available");
                });
            }
        });
    };
});