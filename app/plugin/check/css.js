define(function(require, exports, module) {
    var CSSLint = require("./csslint.js").CSSLint;
    var editor = require("zed/editor");

    return function(data, callback) {
        editor.getText(function(err, text) {
            var result = CSSLint.verify(text);
            editor.setAnnotations(result.messages.map(function(msg) {
                return {
                    row: msg.line - 1,
                    column: msg.col - 1,
                    text: msg.message,
                    type: msg.type
                };
            }), callback);
        });
    };
});