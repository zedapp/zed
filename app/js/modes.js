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

    // Mappings from shebang lines to mode name, e.g. "python3" -> "python"
    var shebangMapping = {};

    // Mode to use if all else fails
    var fallbackMode = {
        language: "text",
        name: "Plain Text",
        highlighter: "ace/mode/text",
        handlers: {},
        commands: {},
        preferences: {},
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
            if (!mode.keys) {
                mode.keys = {};
            }
            if (!mode.preferences) {
                mode.preferences = {};
            }
            if (!mode.handlers) {
                mode.handlers = {};
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
        shebangMapping = {};
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
            shebangMapping[mode.language] = mode.language;
            if (mode.shebangs) {
                mode.shebangs.forEach(function(shebang) {
                    shebangMapping[shebang] = mode.language;
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
                    exec: function(edit, session, callback) {
                        require(["./sandbox"], function(sandbox) {
                            var cmd = commandSpec.modeCommand[session.mode.language];
                            if (cmd) {
                                sandbox.execCommand(name, cmd, session, function(err, result) {
                                    if (err) {
                                        return console.error(err);
                                    }
                                    _.isFunction(callback) && callback(err, result);
                                });
                            } else {
                                if(_.isFunction(callback)) {
                                    callback("not-supported");
                                } else {
                                    eventbus.emit("sessionactivityfailed", session, "Command " + name + " not supported for this mode");
                                }
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

    exports.hook = function() {
        eventbus.on("configchanged", function(config) {
            modes = config.getModes();
            updateAllModes();
        });
    };

    exports.allModes = function() {
        return Object.keys(modes);
    };

    exports.get = function(language) {
        return modes[language];
    };

    exports.getModeForSession = function(session) {
        var path_ = session.filename;
        var filename = path.filename(path_);
        if (filenameMapping[filename]) {
            return exports.get(filenameMapping[filename]);
        }
        var ext = path.ext(path_);
        if (extensionMapping[ext]) {
            return exports.get(extensionMapping[ext]);
        }
        var shebang_line = session.getLine(0);
        for (var shebang in shebangMapping) {
            if (shebang_line.indexOf(shebang) > 0) {
                return exports.get(shebangMapping[shebang]);
            }
        }

        return fallbackMode;
    };

    exports.setSessionMode = function(session) {
        var mode = exports.getModeForSession(session);
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
