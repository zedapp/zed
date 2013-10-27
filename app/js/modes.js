/*global define, _ */
define(function(require, exports, module) {
    "use strict";
    var eventbus = require("./lib/eventbus");
    var command = require("./command");

    eventbus.declare("modesloaded");
    eventbus.declare("modeset");

    var modes = {};
    var extensionMapping = {};

    var fallbackMode = {
        language: "text",
        name: "Plain Text",
        highlighter: "ace/mode/text",
        events: {},
        commands: {},
        snippets: {}
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
        });
    }

    function updateAllModes() {
        console.log("Updating modes...");
        normalizeModes();
        updateExtensionMappings();
        eventbus.emit("modesloaded", exports);
        declareAllModeCommands();
    }

    function updateExtensionMappings() {
        extensionMapping = {};
        Object.keys(modes).forEach(function(language) {
            var mode = modes[language];
            if (mode.extensions) {
                mode.extensions.forEach(function(ext) {
                    extensionMapping[ext] = language;
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
        command.define("Settings:Mode:" + mode.name, {
            exec: function(edit, session) {
                exports.setSessionMode(session, mode);
            },
            readOnly: true
        });

        Object.keys(mode.commands).forEach(function(name) {
            var cmd = mode.commands[name];
            var existingCommand = command.lookup(name);
            if (!existingCommand) {
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
        eventbus.on("settingschanged", function(settings) {
            modes = settings.getModes();
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

    exports.getModeForPath = function(path) {
        var parts = path.split(".");
        var ext = parts[parts.length - 1];
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
            eventbus.emit("modeset", session, mode);
        }
    };
});