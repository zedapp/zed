/*global define*/
define(function(require, exports, module) {
    var session = require("zed/session");
    var ctags = require("zed/ctags");

    var PRED_REGEX = /([a-zA-Z0-9_\-\$]+)\s*[\(\[]([a-zA-Z0-9_\-\$]+(,\s*)?)*[\)\]].*\->/g;
    var indexToLine = require("./util.js").indexToLine;

    return function(data, callback) {
        var match;
        var tags = [];
        var path = data.path;
        session.getText(path, function(err, text) {
            // Regular old functions
            while (match = PRED_REGEX.exec(text)) {
                tags.push({
                    path: path,
                    symbol: match[1],
                    locator: indexToLine(text, match.index)
                });
            }
            ctags.updateCTags(path, tags, callback);
        });
    };
});