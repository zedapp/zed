/*global define*/
define(function(require, exports, module) {
    var session = require("zed/session");
    var ctags = require("zed/ctags");

    var util = require("./util");
    var SEL_REGEX = /[\.#]([a-zA-Z0-9_\-\$]+)[\s\{\.]/g;

    return function(data, callback) {
        var match;
        var tags = [];
        var path = data.path;
        session.getText(path, function(err, text) {
            // Regular old functions
            while (match = SEL_REGEX.exec(text)) {
                tags.push({
                    symbol: match[1],
                    locator: util.indexToLine(text, match.index),
                    path: path
                });
            }
            ctags.updateCTags(path, tags, callback);
        });
    };
});