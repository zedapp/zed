/*global define*/
define(function(require, exports, module) {
    var editor = require("zed/editor");
    var ctags = require("zed/ctags");

    var util = require("./util");
    var SEL_REGEX = /[\.#]([a-zA-Z0-9_\-\$]+)[\s\{\.]/g;

    return function(data, callback) {
        var match;
        var tags = [];
        var path = data.path;
        editor.getText(function(err, text) {
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