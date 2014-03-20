var CSSLint = require("./csslint.js").CSSLint;

/**
 * Inputs: text
 */
module.exports = function(info, callback) {
    var text = info.inputs.text;
    var result = CSSLint.verify(text);
    callback(null, result.messages.map(function(msg) {
        return {
            row: msg.line - 1,
            column: msg.col - 1,
            text: msg.message,
            type: msg.type
        };
    }));
};
