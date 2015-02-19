/*global define, _, zed */
define(function(require, exports, module) {
    plugin.consumes = ["eventbus", "config", "command", "editor"];
    plugin.provides = ["handlers"];
    return plugin;

    function plugin(options, imports, register) {
        var InlineAnnotation = require("./lib/inline_annotation");
        var opts = require("./lib/options");
        var async = require("./lib/async");

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
                        runSessionHandler(null, "configchanged");
                    });
                });
                eventbus.on("sessionbeforesave", function(session) {
                    runSessionHandler(session, "save");
                });
                eventbus.on("sessionchanged", function(session) {
                    analyze(session, null, true);
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
                eventbus.on("sessionclicked", function(edit, session) {
                    // We setTimeout this to make sure the cursor moved to the clicked
                    // position already
                    setTimeout(function() {
                        runSessionHandler(session, "click");
                    });
                });
                eventbus.on("dbavailable", function(db) {
                    setTimeout(function() {
                        db.readStore("_meta").get("meta").then(function(metaObj) {
                            if (!metaObj.initialIndex && opts.get('url').indexOf("http") !== 0) {
                                metaObj.initialIndex = true;
                                db.writeStore("_meta").put(metaObj);
                                indexProject(editor.getActiveEditor(), editor.getActiveSession());
                            }
                        });
                    }, 5000); // Don't start indexing immediately, give it a rest
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
                var timeOut = timeOuts[handlerName][path];
                return timeOut ? Math.max(defaultTimeout, timeOut) : defaultTimeout;
            },
        };

        function getHandlerCommandsForMode(handlerName, mode) {
            var commandNames = [];

            if (mode && mode.handlers[handlerName]) {
                commandNames = commandNames.concat(mode.handlers[handlerName]);
            }
            if (config.getHandlers()[handlerName]) {
                commandNames = commandNames.concat(config.getHandlers()[handlerName]);
            }
            commandNames = commandNames.filter(function(cmdName) {
                return command.isVisible({ // Fake session
                    mode: mode
                }, command.lookup(cmdName), true);
            });
            return commandNames;
        }

        function runSessionHandler(session, handlerName, debounceTimeout) {
            var path, commandNames = [];
            if (session) {
                path = session.filename;
                commandNames = getHandlerCommandsForMode(handlerName, session.mode);
            } else {
                path = "";
                if (config.getHandlers()[handlerName]) {
                    commandNames = config.getHandlers()[handlerName];
                }
                session = editor.getActiveSession();
            }

            function runCommands() {
                var results = [];
                var edit = editor.getActiveEditor();
                var before = Date.now();

                return Promise.all(commandNames.map(function(commandName) {
                    return Promise.resolve(command.exec(commandName, edit, session)).then(function(results_) {
                        results = results.concat(results_);
                    });
                })).then(function() {
                    api.updateHandlerTimeout(handlerName, session.filename, before, debounceTimeout);
                    return results;
                });
            }

            if (commandNames.length > 0) {
                if (debounceTimeout) {
                    var id = path + ':' + handlerName;
                    clearTimeout(timeOutIds[id]);
                    return new Promise(function(resolve, reject) {
                        timeOutIds[id] = setTimeout(function() {
                            runCommands().then(resolve, reject);
                        }, debounceTimeout);
                    });
                } else {
                    return runCommands();
                }
            } else {
                return Promise.resolve(false);
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
        window.timeOuts = timeOuts;

        // window.timeOuts = timeOuts;

        /**
         * Analyzes session and sets findings as annotations
         * @param session session object
         * @param instant perform handler instantly
         * @param isInit is set to true when this handler is called only initially (i.e. not after a change)
         */
        function analyze(session, instant, isChange) {
            if(isChange) {
                runSessionHandler(session, "change", 1000);
            }
            runSessionHandler(session, "index", instant ? null : api.getHandlerTimeout("index", session.filename, 1000));
            runSessionHandler(session, "check", instant ? null : api.getHandlerTimeout("check", session.filename, 2000)).then(function(annos) {
                setAnnotations(session, annos);
            });
        }

        function indexProject(edit, session) {
            var modes = zed.getService("modes");
            var fs = zed.getService("fs");
            var allFiles = zed.getService("goto").getFileCache();
            var filesToIndex = allFiles.filter(function(path) {
                var mode = modes.getModeForPath(path);
                return getHandlerCommandsForMode("index", mode).length > 0;
            });

            var num = 0;

            async.forEach(filesToIndex, function(path, next) {
                num++;
                eventbus.emit("sessionactivitystarted", session, "Indexing " + num + " of " + filesToIndex.length);
                var mode = modes.getModeForPath(path);
                console.log("Indexing", path);
                fs.readFile(path).then(function(text) {
                    var fakeSession = {
                        filename: path,
                        mode: mode,
                        getTokenAt: true,
                        getValue: function() {
                            return text;
                        },
                        getLines: function() {
                            return text.split("\n");
                        }
                    };
                    runSessionHandler(fakeSession, "index", null).then(next);
                }, function(err) {
                    console.log("Could not load", path, err);
                    next();
                });
            }, function done() {
                eventbus.emit("sessionactivitystarted", session, "Indexing complete");
                setTimeout(function() {
                    eventbus.emit("sessionactivitycompleted", session);
                }, 2000);
            });
        }

        command.define("Tools:Index Project", {
            exec: indexProject,
            readOnly: true
        });

        register(null, {
            handlers: api
        });
    }
});
