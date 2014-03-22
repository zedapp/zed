var coffee = require("./coffee-script.js");
var lineRegex = /on line (\d+)/;

module.exports = function(info, callback) {
    var text = info.inputs.text;
    try {
        coffee.compile(text);
    } catch (e) {
        var message = e.message;
        var match = lineRegex.exec(message);
        if (match) {
            var line = parseInt(match[1], 10);
            return callback(null, [{
                row: line,
                text: message.slice(0, match.index),
                type: "error"
            }]);
        }
    }
    callback(null, []);
};
