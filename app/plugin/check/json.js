define(function(require, exports, module) {
    var editor = require("zed/editor");

    var parse = require("./json_parse.js");

    return function(data, callback) {
        editor.getText(function(err, text) {
            try {
                parse(text);
            } catch (e) {
                var lines = text.substring(0, e.at).split("\n");
                return editor.setAnnotations([{
                    row: lines.length-1,
                    text: e.message,
                    type: "error"
                }], callback);
            }
            editor.setAnnotations([], callback);
        });
    };
});