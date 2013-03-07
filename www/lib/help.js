define(function(require, exports, module) {
    var session_manager = require("session_manager");
    var eventbus = require("eventbus");
    var keys = require("keys");
    var useragent = ace.require("ace/lib/useragent")
    
    exports.hook = function() {
        eventbus.once("editorloaded", function() {
            
            function pad(n) {
                var s = '';
                for(var i = 0; i < n; i++)
                    s += ' ';
                return s;
            }
            
            var keysText = "Key cheatsheet\n===============\n\n";
            var platform = useragent.isMac ? "mac" : "win";
            keys.commands.forEach(function(binding) {
                if(!binding.bindKey)
                    return;
                var key = typeof binding.bindKey === "string" ? binding.bindKey : binding.bindKey[platform];
                if(!key)
                    return;
                
                keysText += key + ": " + pad(40 - key.length) + binding.name + "\n";
            });
            session_manager.specialDocs["zed:keys"] = {
                mode: "ace/mode/markdown",
                content: keysText
            };
        });
    };
});
