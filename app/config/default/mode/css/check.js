var CSSLint = require("./csslint.js").CSSLint;
var session = require("zed/session");

module.exports = function(info, callback) {
    var path = info.path;
    session.getText(path, function(err, text) {
        var result = CSSLint.verify(text);
        callback(null, result.messages.map(function(msg) {
            return {
                row: msg.line - 1,
                column: msg.col - 1,
                text: msg.message,
                type: msg.type
            };
        }));
    });
};