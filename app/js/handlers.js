/*global define, _ */
define(function(require, exports, module) {
    var eventbus = require("./lib/eventbus");
    var config = require("./config");
    var command = require("./command");
    var InlineAnnotation = require("./lib/inline_annotation");

    /**
     * This parts handles mode handlers, e.g. "change", "preview" etc.
     */

    var handlerFns = {};

    function runSessionHandler(session, handlerName, debounceTimeout, callback) {
        var path = session.filename;
        var mode = session.mode;
        var commandNames = [];

        require(["./editor"], function(editor) {
            var editors = editor.getEditors();
            var edit = null;
            
            _.each(editors, function(edit_) {
                if(edit_.getSession() === session) {
                    edit = edit_;
                }
            });
            
            if(!edit) {
                // Session is not currently visible, won't run commands
                return;
            }
            
            if (mode && mode.handlers[handlerName]) {
                commandNames = commandNames.concat(mode.handlers[handlerName]);
            }
            if (config.getHandlers()[handlerName]) {
                commandNames = commandNames.concat(config.getHandlers()[handlerName]);
            }

            function runCommands() {
                var waitingFor = commandNames.length;
                var results = [];
                var edit = editor.getActiveEditor();
                commandNames.forEach(function(commandName) {
                    command.exec(commandName, edit, session, function(err, results_) {
                        if (err) {
                            return callback(err);
                        }
                        results = results.concat(results_);
                        waitingFor--;
                        if (waitingFor === 0) {
                            _.isFunction(callback) && callback(null, results);
                        }
                    });
                });
                if (waitingFor === 0) {
                    callback(null, results);
                }
            }

            if (commandNames.length > 0) {
                if (debounceTimeout) {
                    var id = path + ':' + handlerName;
                    if (!handlerFns[id]) {
                        handlerFns[id] = _.debounce(runCommands, debounceTimeout);
                    }
                    handlerFns[id]();
                } else {
                    runCommands();
                }
            }
        });
    }

    exports.runSessionHandler = runSessionHandler;

    function setAnnotations(session, annos) {
        annos = annos || [];
        (session.annotations || []).forEach(function(anno) {
            anno.remove();
        });
        session.annotations = [];
        for (var i = 0; i < annos.length; i++) {
            var anno = annos[i];
            // If no endColum, no inline marker is required
            if (anno.endColumn) {
                session.annotations.push(new InlineAnnotation(session, anno));
            }
        }
        session.setAnnotations(annos);
    }

    exports.hook = function() {
        eventbus.on("sessionchanged", function(session) {
            analyze(session);
        });
        eventbus.on("modeset", function(session) {
            analyze(session);
        });
        eventbus.on("switchsession", function(edit, session) {
            analyze(session, true);
        });
        
        function analyze(session, instant) {
            runSessionHandler(session, "change");
            runSessionHandler(session, "check", instant ? null : 1000, function(err, annos) {
                setAnnotations(session, annos);
            });
        }

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