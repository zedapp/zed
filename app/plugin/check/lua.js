define(function(require, exports, module) {
    var editor = require("zed/editor");

    var parse = require("./lua_parse.js").parse;

    return function(data, callback) {
        editor.getText(function(err, text) {
            try {
                parse(text);
            } catch (e) {
                var message = e.message.split(" ").slice(1).join(" ");
                return editor.setAnnotations([{
                    row: e.line-1,
                    text: message,
                    type: "error"
                }], callback);
            }
            editor.setAnnotations([], callback);
        });
    };
});