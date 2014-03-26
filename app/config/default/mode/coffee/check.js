var coffee = require("./coffee-script.js");
var lineRegex = /on line (\d+)/;

module.exports = function(info) {
    var text = info.inputs.text;
    try {
        coffee.compile(text);
    } catch (e) {
        var message = e.message;
        var match = lineRegex.exec(message);
        if (match) {
            var line = parseInt(match[1], 10);
            return [{
                row: line,
                text: message.slice(0, match.index),
                type: "error"
            }];
        }
    }
    return [];
};
