/*global define, _, zed */
define(function(require, exports, module) {
    plugin.consumes = ["eventbus", "config", "command", "editor"];
    plugin.provides = ["handlers"];
    return plugin;

    function plugin(options, imports, register) {
        var InlineAnnotation = require("./lib/inline_annotation");

        var eventbus = imports.eventbus;
        var config = imports.config;
        var command = imports.command;
        var editor = imports.editor;

        /**
         * This parts handles mode handlers, e.g. "change", "preview" etc.
         */

        var timeOutIds = {};
        var timeOutMultiplicationFactor = 3;

        var api = {
            hook: function() {
                eventbus.on("configchanged", function() {
                    // This looks bad, the reason we need to do this is to allow
                    // The command handler to update its sandbox commands, which happens
                    // within a tick
                    setTimeout(function() {
                        runHandler("configchanged");
                    });
                });
                eventbus.on("sessionbeforesave", function(session) {
                    runSessionHandler(session, "save");
                });
                eventbus.on("sessionchanged", function(session) {
                    analyze(session);
                });
                eventbus.on("modeset", function(session) {
                    analyze(session);
                });
                eventbus.on("switchsession", function(edit, session) {
                    analyze(session, true);
                });
                eventbus.on("preview", function(session) {
                    var didPreview = runSessionHandler(session, "preview");
                    if (!didPreview) {
                        zed.getService("preview").showPreview("Not supported.");
                        eventbus.emit("sessionactivityfailed", session, "No preview available");
                    }
                });
            },
            runSessionHandler: runSessionHandler,
            /**
             * Used to implement adaptive timing. This method records the time it took
             * to execute a particular handler and multiplies it with a multiplciation factor
             * to be used in the next timeout, making sure that expensive handlers aren't
             * using up all CPU cycles in the sandbox.
             */
            updateHandlerTimeout: function(handlerName, path, startTime, minTimeout) {
                if (!timeOuts[handlerName]) {
                    timeOuts[handlerName] = {};
                }
                timeOuts[handlerName][path] = Math.max(minTimeout, (Date.now() - startTime) * timeOutMultiplicationFactor);
            },
            getHandlerTimeout: function(handlerName, path, defaultTimeout) {
                if (!timeOuts[handlerName]) {
                    return defaultTimeout;
                }
                return timeOuts[handlerName][path] || defaultTimeout;
            },
        };

        function runSessionHandler(session, handlerName, debounceTimeout, callback) {
            var path = session.filename;
            var mode = session.mode;
            var commandNames = [];

            var editors = editor.getEditors();
            var edit = null;

            _.each(editors, function(edit_) {
                if (edit_.getSession() === session) {
                    edit = edit_;
                }
            });

            if (!edit) {
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
                var before = Date.now();

                commandNames.forEach(function(commandName) {
                    command.exec(commandName, edit, session, function(err, results_) {
                        if (err) {
                            return callback(err);
                        }
                        results = results.concat(results_);
                        waitingFor--;
                        if (waitingFor === 0) {
                            done();
                        }
                    });
                });

                if (waitingFor === 0) {
                    done();
                }

                function done() {
                    api.updateHandlerTimeout("check", session.filename, before, 500);
                    _.isFunction(callback) && callback(null, results);
                }
            }

            if (commandNames.length > 0) {
                if (debounceTimeout) {
                    var id = path + ':' + handlerName;
                    clearTimeout(timeOutIds[id]);
                    timeOutIds[id] = setTimeout(function() {
                        runCommands();
                    }, debounceTimeout);
                } else {
                    runCommands();
                }
                return true;
            } else {
                _.isFunction(callback) && callback();
                return false;
            }
        }

        function runHandler(handlerName, callback) {
            var commandNames = [];
            if (config.getHandlers()[handlerName]) {
                commandNames = commandNames.concat(config.getHandlers()[handlerName]);
            }

            var waitingFor = commandNames.length;
            var results = [];
            var edit = editor.getActiveEditor();
            var session = edit.getSession();
            commandNames.forEach(function(commandName) {
                command.exec(commandName, edit, session, function(err, results_) {
                    if (err) {
                        console.error("Command", commandName, "returned error:", err);
                        return _.isFunction(callback) && callback(err);
                    }
                    results = results.concat(results_);
                    waitingFor--;
                    if (waitingFor === 0) {
                        _.isFunction(callback) && callback(null, results);
                    }
                });
            });
            if (waitingFor === 0) {
                _.isFunction(callback) && callback(null, results);
            }
        }

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


        // handlerName -> { path -> timeout }
        var timeOuts = {};

        /**
         * Analyzes session and sets findings as annotations
         */
        function analyze(session, instant) {
            runSessionHandler(session, "change", 1000);
            runSessionHandler(session, "check", instant ? null : api.getHandlerTimeout("check", session.filename, 2000), function(err, annos) {
                setAnnotations(session, annos);
            });
        }

        register(null, {
            handlers: api
        });
    }
});
