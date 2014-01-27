/*global define*/
define(function(require, exports, module) {
    var session = require("zed/session");

    var coffee = require("configfs!./coffee-script.js");
    var lineRegex = /on line (\d+)/;

    return function(info, callback) {
        var path = info.path;
        session.getText(path, function(err, text) {
            try {
                coffee.compile(text);
            } catch(e) {
                var message = e.message;
                var match = lineRegex.exec(message);
                if(match) {
                    var line = parseInt(match[1], 10);
                    return callback(null, [{
                        row: line,
                        text: message.slice(0, match.index),
                        type: "error"
                    }]);
                }
            }
            callback(null, []);
        });
    };
});
