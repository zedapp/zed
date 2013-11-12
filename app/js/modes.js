/*global define, _ */
define(function(require, exports, module) {
    "use strict";
    var eventbus = require("./lib/eventbus");
    var command = require("./command");
    var path = require("./lib/path");

    eventbus.declare("modesloaded");
    eventbus.declare("modeset");

    var modes = {};

    // Mappings from file extension to mode name, e.g. "js" -> "javascript"
    var extensionMapping = {};

    // Mappings from particular file names to mode name, e.g. "Makefile" -> "makefile"
    var filenameMapping = {};

    // Mode to use if all else fails
    var fallbackMode = {
        language: "text",
        name: "Plain Text",
        highlighter: "ace/mode/text",
        events: {},
        commands: {},
        snippets: {},
        preferences: {},
        builtins: [],
        keys: {},
        isFallback: true
    };

    function normalizeModes() {
        _.each(modes, function(mode, name) {
            mode.language = name;

            // Normalize
            if (!mode.events) {
                mode.events = {};
            }
            if (!mode.commands) {
                mode.commands = {};
            }
            if (!mode.snippets) {
                mode.snippets = {};
            }
            if (!mode.builtins) {
                mode.builtins = [];
            }
            if (!mode.keys) {
                mode.keys = {};
            }
            if (!mode.preferences) {
                mode.preferences = {};
            }
        });
    }

    function updateAllModes() {
        console.log("Updating modes...");
        normalizeModes();
        updateMappings();
        eventbus.emit("modesloaded", exports);
        declareAllModeCommands();
    }

    function updateMappings() {
        extensionMapping = {};
        filenameMapping = {};
        _.each(modes, function(mode) {
            if (mode.extensions) {
                mode.extensions.forEach(function(ext) {
                    extensionMapping[ext] = mode.language;
                });
            }
            if (mode.filenames) {
                mode.filenames.forEach(function(filename) {
                    filenameMapping[filename] = mode.language;
                });
            }
        });
    }

    function declareAllModeCommands() {
        _.each(exports.allModes(), function(modeName) {
            declareModeCommands(exports.get(modeName));
        });
        eventbus.emit("commandsloaded");
    }

    function declareModeCommands(mode) {
        command.define("Configuration:Mode:" + mode.name, {
            exec: function(edit, session) {
                exports.setSessionMode(session, mode);
            },
            readOnly: true
        });

        _.each(mode.commands, function(cmd, name) {
            var existingCommand = command.lookup(name);

            if (!existingCommand) {
                // Declare it as a special mode command, with an implementation
                // specific to the mode
                var modeCommands = {};
                modeCommands[mode.language] = cmd;
                var commandSpec = {
                    exec: function(edit, session) {
                        require(["./sandbox"], function(sandbox) {
                            var cmd = commandSpec.modeCommand[session.mode.language];
                            if (cmd) {
                                sandbox.execCommand(cmd, session, function(err) {
                                    if (err) {
                                        return console.error(err);
                                    }
                                });
                            } else {
                                eventbus.emit("sessionactivityfailed", session, "Command " + name + " not supported for this mode");
                            }
                        });
                    },
                    readOnly: true,
                    modeCommand: modeCommands
                };
                command.define(name, commandSpec);
            } else {
                existingCommand.modeCommand[mode.language] = cmd;
            }
        });
    }

    /**
     * This parts handles mode events, e.g. "change", "preview" etc.
     */

    var eventHandlerFn;
    var lastEventPath;

    function triggerSessionCommandEvent(session, eventname, debounceTimeout) {
        var mode = session.mode;
        if (!mode) {
            return;
        }
        var path = session.filename;
        var commandNames = mode.events[eventname];

        function runCommands() {
            require(["./editor"], function(editor) {
                var edit = editor.getActiveEditor();
                commandNames.forEach(function(commandName) {
                    command.exec(commandName, edit, session);
                });
            });
        }

        if (commandNames) {
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

        return !!commandNames;
    }

    exports.hook = function() {
        eventbus.on("configchanged", function(config) {
            modes = config.getModes();
            updateAllModes();
        });
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

    exports.allModes = function() {
        return Object.keys(modes);
    };

    exports.get = function(language) {
        return modes[language];
    };

    exports.getModeForPath = function(path_) {
        var filename = path.filename(path_);
        if (filenameMapping[filename]) {
            return exports.get(filenameMapping[filename]);
        }
        var ext = path.ext(path_);
        if (extensionMapping[ext]) {
            return exports.get(extensionMapping[ext]);
        } else {
            return fallbackMode;
        }
    };

    exports.setSessionMode = function(session, mode) {
        if (typeof mode === "string") {
            mode = exports.get(mode);
        }
        if (mode) {
            session.mode = mode;
            session.setMode(mode.highlighter);
            session.clearAnnotations();
            eventbus.emit("modeset", session, mode);
        }
    };
});