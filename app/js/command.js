/*global define, ace, _, chrome */
define(function(require, exports, module) {
    "use strict";
    var useragent = ace.require("ace/lib/useragent");
    var eventbus = require("./lib/eventbus");
    var commands = {};
    var userCommandNames = [];

    eventbus.declare("commandsloaded");

    function loadCustomCommands(settingsfs) {
        settingsfs.readFile("/commands.default.json", function(err, commandsStr) {
            var cmds = JSON.parse(commandsStr);
            settingsfs.readFile("/commands.user.json", function(err, commandsStr) {
                try {
                    cmds = _.extend(cmds, JSON.parse(commandsStr));
                    userCommandNames.forEach(function(cmd) {
                        delete commands[cmd];
                    });
                    userCommandNames = [];
                    _.each(cmds, function(cmd, name) {
                        exports.define(name, {
                            exec: function(edit) {
                                require(["./sandbox"], function(sandbox) {
                                    sandbox.execCommand(cmd, edit.getSession(), function(err) {
                                        if (err) {
                                            return console.error(err);
                                        }
                                    });
                                });
                            },
                            readOnly: cmd.readOnly
                        });
                        userCommandNames.push(name);
                    });
                } catch (e) {}
                eventbus.emit("commandsloaded");
            });
        });
    }

    exports.init = function() {
        require(["./fs/settings"], function(settingsfs) {
            loadCustomCommands(settingsfs);

            settingsfs.watchFile("/commands.user.json", function() {
                loadCustomCommands(settingsfs);
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
        return commands[path];
    };

    exports.exec = function(path, edit, session, otherArgs) {
        var def = exports.lookup(path);
        if(!session.getTokenAt) { // Check if this is a session object
            console.error("Did not pass in session to exec", arguments);
        }
        def.exec.apply(null, _.toArray(arguments).slice(1));
    };

    exports.allCommands = function() {
        return Object.keys(commands);
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
                        var cmd = exports.lookup(result.path);
                        // Filter out commands that are language-specific and don't apply to this mode
                        if(cmd.modeCommand) {
                            var modeName = session.mode.language;
                            return cmd.modeCommand[modeName];
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

    exports.define("Settings:Preferences", {
        exec: function() {
            chrome.app.window.create('editor.html?url=settings:&title=Settings&chromeapp=true', {
                frame: 'chrome',
                width: 720,
                height: 400,
            });
        },
        readOnly: true
    });

    exports.define("Settings:Toggle Highlight Active Line", {
        exec: function() {
            require(["./settings"], function(settings) {
                settings.set("highlightActiveLine", !settings.get("highlightActiveLine"));
            });
        },
        readOnly: true
    });

    exports.define("Settings:Toggle Highlight Gutter Line", {
        exec: function() {
            require(["./settings"], function(settings) {
                settings.set("highlightGutterLine", !settings.get("highlightGutterLine"));
            });
        },
        readOnly: true
    });

    exports.define("Settings:Toggle Show Print Margin", {
        exec: function() {
            require(["./settings"], function(settings) {
                settings.set("showPrintMargin", !settings.get("showPrintMargin"));
            });
        },
        readOnly: true
    });

    exports.define("Settings:Toggle Show Invisibles", {
        exec: function() {
            require(["./settings"], function(settings) {
                settings.set("showInvisibles", !settings.get("showInvisibles"));
            });
        },
        readOnly: true
    });

    exports.define("Settings:Toggle Display Indent Guides", {
        exec: function() {
            require(["./settings"], function(settings) {
                settings.set("displayIndentGuides", !settings.get("displayIndentGuides"));
            });
        },
        readOnly: true
    });

    exports.define("Settings:Toggle Show Gutter", {
        exec: function() {
            require(["./settings"], function(settings) {
                settings.set("showGutter", !settings.get("showGutter"));
            });
        },
        readOnly: true
    });

    exports.define("Editor:Reset State", {
        exec: function() {
            require(["./state"], function(state) {
                state.reset();
            });
        },
        readOnly: true
    });
});