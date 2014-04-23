/*global define, ace, _, chrome, zed */
define(function(require, exports, module) {
    "use strict";

    plugin.consumes = ["eventbus", "keys"];
    plugin.provides = ["command"];
    return plugin;

    function plugin(options, imports, register) {
        var useragent = require("ace/lib/useragent");
        var fuzzyfind = require("./lib/fuzzyfind");

        var eventbus = imports.eventbus;
        var keys = imports.keys;

        var commands = {};

        // Commands coming from configuration somehow (user commands, theme commands)
        var configCommands = {};

        // Triggered by mode.js when mode commands were loaded
        eventbus.declare("commandsloaded");
        // Triggered when config commands were reset and should be reloaded from config
        eventbus.declare("configcommandsreset");
        eventbus.declare("executedcommand");

        function defineUserCommand(name, cmd) {
            api.defineConfig(name, {
                doc: cmd.doc,
                exec: function(edit, session, callback) {
                    zed.getService("sandbox").execCommand(name, cmd, session, function(err, result) {
                        if (err) {
                            console.error("Command", name, "failed:", err);
                        }
                        _.isFunction(callback) && callback(err, result);
                    });
                },
                readOnly: cmd.readOnly,
                internal: cmd.internal
            });
        }


        var api = {
            hook: function() {
                eventbus.on("configchanged", function(config) {
                    configCommands = {};
                    _.each(config.getCommands(), function(cmd, name) {
                        defineUserCommand(name, cmd);
                    });
                    eventbus.emit("configcommandsreset", config);
                });
            },
            /**
             * @param path in the form of 'Editor:Select All'
             * @param definition json object:
             *  {
             *      exec: function() { ... },
             *      readOnly: true
             *  }
             */
            define: function(path, def) {
                def.name = path;
                commands[path] = def;
            },

            defineConfig: function(path, def) {
                def.name = path;
                configCommands[path] = def;
            },

            lookup: function(path) {
                return configCommands[path] || commands[path];
            },

            exec: function(path, edit, session, callback) {
                var def = api.lookup(path);
                if (!session.getTokenAt) { // Check if this is a session object
                    console.error("Did not pass in session to exec", arguments);
                }
                def.exec.apply(null, _.toArray(arguments).slice(1));
            },

            allCommands: function() {
                return Object.keys(configCommands).concat(Object.keys(commands));
            }
        };


        function identifyCurrentKey(key) {
            if (key) {
                if (_.isString(key)) {
                    return key;
                } else {
                    return useragent.isMac ? key.mac : key.win;
                }
            }
        }

        api.define("Command:Enter Command", {
            doc: "Prompts for a command to invoke, with a convenient searchable interface.",
            exec: function(edit, session) {
                // Lazy loading these
                var recentCommands = zed.getService("state").get("recent.commands") || {};
                var commandKeys = keys.getCommandKeys();

                function filter(phrase) {
                    var results = fuzzyfind(api.allCommands(), phrase);
                    results = results.filter(function(result) {
                        result.meta = identifyCurrentKey(commandKeys[result.path]);
                        // Let's rename the `cmd` variable using multiple cursors...
                        // There are three instances
                        var command = api.lookup(result.path);
                        // Filter out commands that are language-specific and don't apply to this mode
                        if (command.modeCommand) {
                            if (!session.mode) {
                                return true;
                            }
                            var modeName = session.mode.language;
                            return command.modeCommand[modeName] && !command.modeCommand[modeName].internal;
                        }
                        if (command.internal) {
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
                zed.getService("ui").filterBox({
                    placeholder: "Enter command",
                    filter: filter,
                    onSelect: function(cmd) {
                        recentCommands[cmd] = Date.now();
                        zed.getService("state").set("recent.commands", recentCommands);
                        api.exec(cmd, edit, edit.getSession());
                        eventbus.emit("executedcommand", cmd);
                    }
                });
            },
            readOnly: true
        });

        api.define("Help:Commands", {
            exec: function(edit, session) {
                zed.getService("session_manager").go("zed::commands", edit, session, function(err, session) {
                    var command_list = "> Zed Online Command Reference.\n" +
                        "\n   What follows is a complete reference of all commands " +
                        "known to Zed, and their current keybindings, even if " +
                        "you've modified the defaults. Click a command to activate it.\n\n" +
                        "   `Fold:Fold All`\n   `Fold:Unfold All`\n\n\n";
                    var commandKeys = keys.getCommandKeys();
                    var prev_tree = [];
                    api.allCommands().sort().forEach(function(command_name) {
                        // Ignore internal and wrong-mode commands.
                        var command = api.lookup(command_name) || {};
                        try {
                            if (command.modeCommand[session.mode.language].internal) {
                                return;
                            }
                        } catch (e) { }
                        if (command.internal) {
                            return;
                        }

                        // Add headers for different sections.
                        var command_tree = command_name.split(":");
                        var len = command_tree.length - 1;
                        for (var i = 0; i < len; ++i) {
                            if (prev_tree[i] !== command_tree[i]) {
                                command_list += "\n"+ new Array(i + 2).join("#") +
                                    " " + command_tree[i] + "\n\n";
                            }
                        }
                        prev_tree = command_tree;

                        // Get the command documentation.
                        var doc = command.doc ? "\n   " +
                            command.doc.replace(/\n/g, "\n\n   ") + "\n" : "";

                        // Get the current keybinding.
                        var binding = identifyCurrentKey(commandKeys[command_name]) || "";
                        binding = binding ? "`" + binding + "`" : "Not set";

                        // Add the full command details to the document.
                        command_list +=
                            "\n>    " + command_tree.slice(-1) + "\n" +
                            "\n   `" + command_name + "`" +
                            "\n   Current Key Binding:    " + binding +
                            "\n" + doc + "\n";
                    });
                    session.setValue(command_list);
                });
            },
            readOnly: true
        });

        api.define("Configuration:Reset Editor State", {
            doc: "Reset the editor to it's initial state.",
            exec: function() {
                zed.getService("state").reset();
            },
            readOnly: true
        });

        register(null, {
            command: api
        });
    }
});
