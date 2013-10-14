/*global define*/
define(function(require, exports, module) {
    var editor = require("zed/editor");

    var coffee = require("../preview/coffee-script");
    var lineRegex = /on line (\d+)/;

    return function(data, callback) {
        editor.getText(function(err, text) {
            try {
                coffee.compile(text);
            } catch(e) {
                var message = e.message;
                var match = lineRegex.exec(message);
                if(match) {
                    var line = parseInt(match[1], 10);
                    return editor.setAnnotations([{
                        row: line,
                        text: message.slice(0, match.index),
                        type: "error"
                    }], callback);
                }
            }
            editor.setAnnotations([], callback);
        });
    };

});
