/*global define*/
define(function(require, exports, module) {
    var session = require("zed/session");
    var ctags = require("zed/ctags");

    var FN_REGEX = /([a-zA-Z0-9_\-\$]+)\s*[=:]\s*\([a-zA-Z0-9_\-\$]+/g;
    var indexToLine = require("./util.js").indexToLine;

    return function(data, callback) {
        var match;
        var path = data.path;
        var tags = [];
        session.getText(path, function(err, text) {
            // Regular old functions
            while (match = FN_REGEX.exec(text)) {
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