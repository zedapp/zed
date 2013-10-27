/*global define, ace, _, chrome */
define(function(require, exports, module) {
    "use strict";

    var useragent = ace.require("ace/lib/useragent");
    var eventbus = require("./lib/eventbus");

    var commands = {};
    var userCommands = {};

    eventbus.declare("commandsloaded");

    function defineSandboxCommands(commandObj, cmds) {
        _.each(cmds, function(cmd, name) {
            commandObj[name] = {
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
            };
        });
    }

    exports.hook = function() {
        eventbus.on("settingschanged", function(settings) {
            userCommands = {};
            defineSandboxCommands(userCommands, settings.getCommands());
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
        if(cmd) {
            return cmd;
        }
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
        return Object.keys(userCommands)
               .concat(Object.keys(commands));
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
                            if(!session.mode) {
                                return true;
                            }
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

    exports.define("Settings:Edit Preferences", {
        exec: function() {
            chrome.app.window.create('editor.html?url=settings:&title=Settings&chromeapp=true', {
                frame: 'chrome',
                width: 720,
                height: 400,
            });
        },
        readOnly: true
    });

    exports.define("Settings:Preferences:Toggle Highlight Active Line", {
        exec: function() {
            require(["./settings"], function(settings) {
                settings.setPreference("highlightActiveLine", !settings.getPreference("highlightActiveLine"));
            });
        },
        readOnly: true
    });

    exports.define("Settings:Preferences:Toggle Highlight Gutter Line", {
        exec: function() {
            require(["./settings"], function(settings) {
                settings.setPreference("highlightGutterLine", !settings.getPreference("highlightGutterLine"));
            });
        },
        readOnly: true
    });

    exports.define("Settings:Preferences:Toggle Show Print Margin", {
        exec: function() {
            require(["./settings"], function(settings) {
                settings.setPreference("showPrintMargin", !settings.getPreference("showPrintMargin"));
            });
        },
        readOnly: true
    });

    exports.define("Settings:Preferences:Toggle Show Invisibles", {
        exec: function() {
            require(["./settings"], function(settings) {
                settings.setPreference("showInvisibles", !settings.getPreference("showInvisibles"));
            });
        },
        readOnly: true
    });

    exports.define("Settings:Preferences:Toggle Display Indent Guides", {
        exec: function() {
            require(["./settings"], function(settings) {
                settings.setPreference("displayIndentGuides", !settings.getPreference("displayIndentGuides"));
            });
        },
        readOnly: true
    });

    exports.define("Settings:Preferences:Toggle Show Gutter", {
        exec: function() {
            require(["./settings"], function(settings) {
                settings.setPreference("showGutter", !settings.getPreference("showGutter"));
            });
        },
        readOnly: true
    });

    exports.define("Settings:Reset Editor State", {
        exec: function() {
            require(["./state"], function(state) {
                state.reset();
            });
        },
        readOnly: true
    });
});