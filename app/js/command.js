/*global define, ace, _, chrome */
define(function(require, exports, module) {
    "use strict";

    var useragent = require("ace/lib/useragent");
    var eventbus = require("./lib/eventbus");

    var commands = {};

    // Commands coming from configuration somehow (user commands, theme commands)
    var configCommands = {};

    // Triggered by mode.js when mode commands were loaded
    eventbus.declare("commandsloaded");
    // Triggered when config commands were reset and should be reloaded from config
    eventbus.declare("configcommandsreset");

    function defineUserCommand(name, cmd) {
        exports.defineConfig(name, {
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
            readOnly: cmd.readOnly,
            internal: cmd.internal
        });
    }

    exports.hook = function() {
        eventbus.on("configchanged", function(config) {
            configCommands = {};
            _.each(config.getCommands(), function(cmd, name) {
                defineUserCommand(name, cmd);
            });
            eventbus.emit("configcommandsreset", config);
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

    exports.defineConfig = function(path, def) {
        def.name = path;
        configCommands[path] = def;
    };

    exports.lookup = function(path) {
        return configCommands[path] || commands[path];
    };

    exports.exec = function(path, edit, session, callback) {
        var def = exports.lookup(path);
        if (!session.getTokenAt) { // Check if this is a session object
            console.error("Did not pass in session to exec", arguments);
        }
        def.exec.apply(null, _.toArray(arguments).slice(1));
    };

    exports.allCommands = function() {
        return Object.keys(configCommands).concat(Object.keys(commands));
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
                            return command.modeCommand[modeName] && !command.modeCommand[modeName].internal;
                        }
                        if(command.internal) {
                            return false;
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

    exports.define("Configuration:Reset Editor State", {
        exec: function() {
            require(["./state"], function(state) {
                state.reset();
            });
        },
        readOnly: true
    });
});
