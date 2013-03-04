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

    exports.bind = function(key, callback) {
        keyboardHandler.bindKey(key, {
            name: "key: " + key,
            exec: callback
        });
    };
});
