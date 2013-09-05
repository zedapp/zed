/*global define ace _ chrome */
define(function(require, exports, module) {
    "use strict";
    var useragent = ace.require("ace/lib/useragent");
    var commands = {};
    
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
    
    exports.exec = function(path) {
        var def = exports.lookup(path);
        def.exec.apply(null, _.toArray(arguments).slice(1));
    };
    
    exports.allCommands = function() {
        return Object.keys(commands);
    };
    
    exports.define("Command:Enter Command", {
        exec: function() {
            // Lazy loading these
            require(["./lib/ui", "./lib/fuzzyfind", "./editor", "./keys", "./state"], function(ui, fuzzyfind, editor, keys, state) {
                var recentCommands = state.get("recent.commands") || {};
                var commandKeys = keys.getCommandKeys();
                
                function filter(phrase) {
                    var results = fuzzyfind(exports.allCommands(), phrase);
                    results.forEach(function(result) {
                        var k = commandKeys[result.path];
                        if(k) {
                            if(_.isString(k)) {
                                result.meta = k;
                            } else {
                                result.meta = useragent.isMac ? k.mac : k.win;
                            }
                        }
                    });
                    results.sort(function(a, b) {
                        if(a.score === b.score) {
                            var lastUseA = recentCommands[a.name] || 0;
                            var lastUseB = recentCommands[b.name] || 0;
                            if(lastUseA === lastUseB) {
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
                        exports.exec(cmd, editor.getActiveEditor());
                    }
                });
            });
        },
        readOnly: true
    });
    
    exports.define("Settings:Preferences", {
        exec: function() {
            chrome.app.window.create('editor.html?url=settings:&chromeapp=true', {
                frame: 'chrome',
                width: 720,
                height: 400,
            });
        }
    });
    exports.define("Help:Open Manual", {
        exec: function() {
            chrome.app.window.create('editor.html?url=manual:&chromeapp=true', {
                frame: 'chrome',
                width: 720,
                height: 400,
            });
        }
    });
    
    exports.define("Reset State", {
        exec: function() {
            require(["./state"], function(state) {
                state.reset();
            });
        }
    });
});
