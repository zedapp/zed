var parse = require("./lua_parse.js").parse;

/**
 * Required inputs: text
 */
module.exports = function(info) {
    var text = info.inputs.text;
    try {
        parse(text);
    } catch (e) {
        var message = e.message.split(" ").slice(1).join(" ");
        return [{
            row: e.line - 1,
            text: message,
            type: "error"
        }];
    }
    return [];
};
