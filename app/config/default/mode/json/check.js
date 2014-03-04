var session = require("zed/session");

var parse = require("./json_parse.js");

module.exports = function(info, callback) {
    var path = info.path;
    session.getText(path, function(err, text) {
        try {
            parse(text);
        } catch (e) {
            var lines = text.substring(0, e.at).split("\n");
            return callback(null, [{
                row: lines.length-1,
                text: e.message,
                type: "error"
            }], callback);
        }
        callback(null, []);
    });
};