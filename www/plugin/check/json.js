define(function(require, exports, module) {
    var parse = require("./json_parse.js");

    return function(options, content, callback) {
        try {
            var result = parse(content);
        } catch (e) {
            var lines = content.substring(0, e.at).split("\n");
            return callback(null, [{
                row: lines.length-1,
                text: e.message,
                type: "error"
            }]);
        }
        callback(null, []);
    };
});