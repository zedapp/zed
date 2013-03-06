define(function(require, exports, module) {
    var eventbus = require("eventbus");
    var editor = require("editor");
    var keyboardHanlder = null;

    eventbus.declare("keysbindable");

    exports.hook = function() {
        eventbus.once("editorloaded", function() {
            keyboardHandler = editor.getActiveEditor().getKeyboardHandler();
            eventbus.emit("keysbindable", exports);
        });
    };

    exports.init = function() {

    };
    
    var keysStack = [[]];
    window.keyStack = keysStack;
    
    function peek() {
        return keysStack[keysStack.length - 1];
    }
    
    exports.push = function() {
        keysStack.push([]);
    };
    
    exports.pop = function() {
        var keys = peek();
        keys.forEach(function(keyId) {
            console.log("keyId", keyId);
            keyboardHandler.removeCommand(keyId);
        });
        keyStack.pop();
    };

    exports.bind = function(key, callback) {
        var keyId = keysStack.length + ":" + key;
        keyboardHandler.bindKey(key, {
            name: keyId,
            exec: callback
        });
        peek().push(keyId);
    };
});
