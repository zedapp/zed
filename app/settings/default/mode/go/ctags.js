/*global define*/
define(function(require, exports, module) {
    var session = require("zed/session");
    var ctags = require("zed/ctags");

    var SEL_REGEX = /(func|type)\s*(\([^\)]+\))?\s*([a-zA-Z0-9_\-\$]+)[\s\(]/g;
    var indexToLine = require("zed/util").indexToLine;

    return function(data, callback) {
        var match;
        var tags = [];
        var path = data.path;
        session.getText(path, function(err, text) {
            // Regular old functions
            while (match = SEL_REGEX.exec(text)) {
                tags.push({
                    path: path,
                    symbol: match[3],
                    locator: indexToLine(text, match.index)
                });
            }

            ctags.updateCTags(path, tags, callback);
        });
    };
});