var parse = require("./json_parse.js");

/**
 * Required inputs: text
 */
module.exports = function(info, callback) {
    var text = info.inputs.text;
    try {
        parse(text);
    } catch (e) {
        var lines = text.substring(0, e.at).split("\n");
        return callback(null, [{
            row: lines.length - 1,
            text: e.message,
            type: "error"
        }], callback);
    }
    callback(null, []);
};
