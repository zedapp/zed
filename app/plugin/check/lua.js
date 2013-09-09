define(function(require, exports, module) {
    var parse = require("./lua_parse.js").parse;

    return function(options, content, callback) {
        try {
            var result = parse(content);
        } catch (e) {
            var message = e.message.split(" ").slice(1).join(" ");
            return callback(null, [{
                row: e.line-1,
                text: message,
                type: "error"
            }]);
        }
        callback(null, []);
    };
});