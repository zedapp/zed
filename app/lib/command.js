define(function(require, exports, module) {
    
    var api = exports.api = {};
    var allCommands = [];
    
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
        allCommands.push(path);
        var parts = path.split(':');
        var root = api;
        for(var i = 0; i < parts.length - 1; i++) {
            var p = pathPartToJs(parts[i]);
            if(!root[p]) {
                root[p] = {};
            }
            root = root[p];
        }
        var lastPart = pathPartToJs(parts[parts.length-1]);
        root[lastPart] = def;
    };
    
    exports.lookup = function(path) {
        var parts = path.split(':');
        var root = api;
        for(var i = 0; i < parts.length; i++) {
            var p = pathPartToJs(parts[i]);
            if(!root[p]) {
                throw Error("No such command: " + path);
            }
            root = root[p];
        }
        return root;
    };
    
    exports.exec = function(path) {
        var def = exports.lookup(path);
        def.exec.apply(null, Array.prototype.slice.call(arguments, 1));
    };
    
    exports.allCommands = function() {
        return allCommands;
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
            require(["ui", "fuzzyfind", "editor"], function(ui, fuzzyfind, editor) {
                function filter(phrase) {
                    return fuzzyfind(allCommands, phrase);
                }
                ui.filterBox("Enter command", filter, function(cmd) {
                    exports.exec(cmd, editor.getActiveEditor());
                });
            });
        },
        readOnly: true
    });
});