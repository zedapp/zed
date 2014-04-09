var CSSLint = require("./csslint.js").CSSLint;

/**
 * Inputs: text
 */
module.exports = function(info) {
    var text = info.inputs.text;
    var rules = CSSLint.getRuleset();
    if (info.options) {
        setRules(rules, info.options);
    }

    var result = CSSLint.verify(text, rules);
    return result.messages.map(function(msg) {
        return {
            row: msg.line - 1,
            column: msg.col - 1,
            text: msg.message,
            type: msg.type
        };
    });
};

function setRules(rules, options) {
    Object.keys(options).forEach(function(k) {
        if (options[k] === false) {
            delete rules[k];
        }
    });
}
