/*global define, _ */
define(function(require, exports, module) {
    "use strict";
    var eventbus = require("./lib/eventbus");
    var async = require("./lib/async");
    var settingsfs = require("./fs/settings");
    var command = require("./command");

    eventbus.declare("modesloaded");
    eventbus.declare("modeset");

    var modes = bareMinimumModes();
    var extensionMapping = {};

    function bareMinimumModes() {
        return {
            text: {
                language: "text",
                name: "Plain Text",
                highlighter: "ace/mode/text"
            }
        };
    }

    function loadMode(path, callback) {
        settingsfs.readFile(path, function(err, text) {
            try {
                var json = JSON.parse(text);
                var filename = path.split("/")[2];
                var parts = filename.split(".");
                var language = parts[0];
                var type = parts[1];
                if (type === "default") {
                    json.language = language;
                    // Overwrite existing mode
                    modes[language] = json;
                } else if (type === "user") {
                    var mode = modes[language];
                    Object.keys(json).forEach(function(key) {
                        mode[key] = json[key];
                    });
                }
            } catch (e) {
                console.error("Error loading mode:", e);
            } finally {
                console.log("Loaded mode from", path);
                callback && callback();
            }
        });
    }

    function loadModes() {
        settingsfs.listFiles(function(err, paths) {
            if (err) {
                return console.error("Could not load settings file list");
            }
            modes = bareMinimumModes();
            // Sorting to ensure "default" comes before "user"
            paths.sort();
            async.forEach(paths, function(path, next) {
                if (path.indexOf("/mode/") === 0) {
                    loadMode(path, next);
                } else {
                    next();
                }
            }, function() {
                extensionMapping = {};
                Object.keys(modes).forEach(function(language) {
                    var mode = modes[language];
                    if (mode.extensions) {
                        mode.extensions.forEach(function(ext) {
                            extensionMapping[ext] = language;
                        });

                    }
                    var userModePath = "/mode/" + language + ".user.json";
                    settingsfs.watchFile(userModePath, function() {
                        loadMode(userModePath);
                    });
                });
                eventbus.emit("modesloaded", exports);
                declareModeCommands();
                declareModeEvents();
            });
        });
    }

    function declareModeCommands() {
        Object.keys(modes).forEach(function(language) {
            var mode = modes[language];

            command.define("Editor:Mode:" + mode.name, {
                exec: function(edit) {
                    exports.setSessionMode(edit.getSession(), mode);
                },
                readOnly: true
            });

            Object.keys(mode).forEach(function(key) {
                if (key.indexOf("command:") === 0) {
                    var name = key.substring("command:".length);
                    var cmd = mode[key];
                    var existingCommand = command.lookup(name);
                    if (!existingCommand) {
                        var modeCommands = {};
                        modeCommands[mode.name] = cmd;
                        var commandSpec = {
                            exec: function(edit) {
                                require(["./sandbox"], function(sandbox) {
                                    var session = edit.getSession();
                                    var cmd = commandSpec.modeCommand[session.mode.name];
                                    if (cmd) {
                                        sandbox.execCommand(cmd, edit.getSession(), function(err) {
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
                        existingCommand.modeCommand[mode.name] = cmd;
                    }
                }
            });
        });
        eventbus.emit("commandsloaded");
    }

    var eventHandlerFn;
    var lastEventPath;

    function triggerSessionCommandEvent(session, eventname, debounceTimeout) {
        var mode = session.mode;
        if(!mode) {
            return;
        }
        var path = session.filename;
        var commandNames = mode["on:" + eventname];

        function runCommands() {
            require(["./editor"], function(editor) {
                var edit = editor.getActiveEditor();
                commandNames.forEach(function(commandName) {
                    command.exec(commandName, edit);
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
    }

    function declareModeEvents() {
        eventbus.on("sessionchanged", function(session) {
            require(["./editor"], function(editor) {
                if(editor.getActiveSession() === session) {
                    triggerSessionCommandEvent(session, "textchange", 1000);
                }
            });
        });
        eventbus.on("modeset", function(session) {
            require(["./editor"], function(editor) {
                if(editor.getActiveSession() === session) {
                    triggerSessionCommandEvent(session, "textchange");
                }
            });
        });
        eventbus.on("switchsession", function(session) {
            triggerSessionCommandEvent(session, "textchange");
        });
    }

    exports.hook = function() {
        loadModes();
    };

    exports.get = function(language) {
        return modes[language];
    };

    exports.getModeForPath = function(path) {
        var parts = path.split(".");
        var ext = parts[parts.length - 1];
        if (extensionMapping[ext]) {
            return modes[extensionMapping[ext]];
        } else {
            return modes.text;
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