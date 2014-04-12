//var lsc = require("./lib/livescript.js");
var lsc = require("./livescript.js").LiveScript;
var lineRegex = /on line (\d+)/;

module.exports = function(info) {
    var text = info.inputs.text;
    try {
        lsc.compile(text);
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
