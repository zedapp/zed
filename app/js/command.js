/*global define, ace, _, chrome */
define(function(require, exports, module) {
    "use strict";

    var useragent = require("ace/lib/useragent");
    var eventbus = require("./lib/eventbus");

    var commands = {};
    var userCommands = {};

    eventbus.declare("commandsloaded");

    function defineUserCommand(name, cmd) {
        userCommands[name] = {
            exec: function(edit, session, callback) {
                require(["./sandbox"], function(sandbox) {
                    sandbox.execCommand(name, cmd, session, function(err, result) {
                        if (err) {
                            console.error(err);
                        }
                        _.isFunction(callback) && callback(err, result);
                    });
                });
            },
            readOnly: cmd.readOnly
        };
    }

    exports.hook = function() {
        eventbus.on("configchanged", function(config) {
            userCommands = {};
            _.each(config.getCommands(), function(cmd, name) {
                defineUserCommand(name, cmd);
            });
        });
    };

    /**
     * @param path in the form of 'Editor:Select All'
     * @param definition json object:
     *  {
     *      exec: function() { ... },
     *      readOnly: true
     *  }
     */
    exports.define = function(path, def) {
        def.name = path;
        commands[path] = def;
    };

    exports.lookup = function(path) {
        var cmd = userCommands[path];
        if (cmd) {
            return cmd;
        }
        return commands[path];
    };

    exports.exec = function(path, edit, session, callback) {
        var def = exports.lookup(path);
        if (!session.getTokenAt) { // Check if this is a session object
            console.error("Did not pass in session to exec", arguments);
        }
        def.exec.apply(null, _.toArray(arguments).slice(1));
    };

    exports.allCommands = function() {
        return Object.keys(userCommands).concat(Object.keys(commands));
    };

    exports.define("Command:Enter Command", {
        exec: function(edit, session) {
            // Lazy loading these
            require(["./lib/ui", "./lib/fuzzyfind", "./editor", "./keys", "./state"], function(ui, fuzzyfind, editor, keys, state) {
                var recentCommands = state.get("recent.commands") || {};
                var commandKeys = keys.getCommandKeys();

                function filter(phrase) {
                    var results = fuzzyfind(exports.allCommands(), phrase);
                    results = results.filter(function(result) {
                        var k = commandKeys[result.path];
                        if (k) {
                            if (_.isString(k)) {
                                result.meta = k;
                            } else {
                                result.meta = useragent.isMac ? k.mac : k.win;
                            }
                        }
                        // Let's rename the `cmd` variable using multiple cursors...
                        // There are three instances
                        var command = exports.lookup(result.path);
                        // Filter out commands that are language-specific and don't apply to this mode
                        if (command.modeCommand) {
                            if (!session.mode) {
                                return true;
                            }
                            var modeName = session.mode.language;
                            return command.modeCommand[modeName];
                        }
                        return true;
                    });
                    results.sort(function(a, b) {
                        if (a.score === b.score) {
                            var lastUseA = recentCommands[a.name] || 0;
                            var lastUseB = recentCommands[b.name] || 0;
                            if (lastUseA === lastUseB) {
                                return a.name < b.name ? -1 : 1;
                            } else {
                                return lastUseB - lastUseA;
                            }
                        } else {
                            return b.score - a.score;
                        }
                    });
                    return results;
                }
                ui.filterBox({
                    placeholder: "Enter command",
                    filter: filter,
                    onSelect: function(cmd) {
                        recentCommands[cmd] = Date.now();
                        state.set("recent.commands", recentCommands);
                        exports.exec(cmd, edit, edit.getSession());
                    }
                });
            });
        },
        readOnly: true
    });

    exports.define("Configuration:Preferences:Toggle Highlight Active Line", {
        exec: function() {
            require(["./config"], function(config) {
                config.setPreference("highlightActiveLine", !config.getPreference("highlightActiveLine"));
            });
        },
        readOnly: true
    });

    exports.define("Configuration:Preferences:Toggle Highlight Gutter Line", {
        exec: function() {
            require(["./config"], function(config) {
                config.setPreference("highlightGutterLine", !config.getPreference("highlightGutterLine"));
            });
        },
        readOnly: true
    });

    exports.define("Configuration:Preferences:Toggle Show Print Margin", {
        exec: function() {
            require(["./config"], function(config) {
                config.setPreference("showPrintMargin", !config.getPreference("showPrintMargin"));
            });
        },
        readOnly: true
    });

    exports.define("Configuration:Preferences:Toggle Show Invisibles", {
        exec: function() {
            require(["./config"], function(config) {
                config.setPreference("showInvisibles", !config.getPreference("showInvisibles"));
            });
        },
        readOnly: true
    });

    exports.define("Configuration:Preferences:Toggle Display Indent Guides", {
        exec: function() {
            require(["./config"], function(config) {
                config.setPreference("displayIndentGuides", !config.getPreference("displayIndentGuides"));
            });
        },
        readOnly: true
    });

    exports.define("Configuration:Preferences:Toggle Show Gutter", {
        exec: function() {
            require(["./config"], function(config) {
                config.setPreference("showGutter", !config.getPreference("showGutter"));
            });
        },
        readOnly: true
    });

    exports.define("Configuration:Reset Editor State", {
        exec: function() {
            require(["./state"], function(state) {
                state.reset();
            });
        },
        readOnly: true
    });
});