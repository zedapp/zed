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
        def.exec.apply(null, Array.prototype.slice.call(arguments, 1));
    };
    
    exports.allCommands = function() {
        return Object.keys(commands);
    };
    
    function pathPartToJs(path) {
        var parts = path.split(/\s+/);
        var result = '';
        for(var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if(part.toUpperCase() === part) {
                result += part;
            } else if(i === 0) {
                result += part[0].toLowerCase() + part.substring(1);
            } else {
                result += part[0].toUpperCase() + part.substring(1);
            }
        }
        return result;
    }
    
    exports.define("Command:Enter Command", {
        exec: function() {
            require(["./ui", "./fuzzyfind", "./editor", "./keys", "./state"], function(ui, fuzzyfind, editor, keys, state) {
                var recentCommands = state.get("recent.commands") || {};
                var commandKeys = keys.getCommandKeys();
                
                function filter(phrase) {
                    var results = fuzzyfind(exports.allCommands(), phrase);
                    results.forEach(function(result) {
                        var k = commandKeys[result.path];
                        if(k) {
                            if(typeof k === "string") {
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
});