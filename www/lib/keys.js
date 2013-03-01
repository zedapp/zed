define(function(require, exports, module) {
    var keyboardHandler = require("editor").ace.getKeyboardHandler();
    exports.bind = function(key, callback) {
        keyboardHandler.bindKey(key, {
            name: "key: " + key,
            exec: callback
        });
    };
});
