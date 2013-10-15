/*global define*/
define(function(require, exports, module) {
    var session = require("zed/session");
    var ctags = require("zed/ctags");

    var FN_REGEX = /function\s+([a-zA-Z0-9_\-\$]+)\s*\(/g;
    var PROP_FN_REGEX = /([a-zA-Z0-9_\-\$]+)\s*[:=]\s*function\s*\(/g;
    var indexToLine = require("./util.js").indexToLine;

    return function(data, callback) {
        var match;
        var tags = [];
        var path = data.path;
        session.getText(path, function(err, text) {
            // Regular old functions
            while(match = FN_REGEX.exec(text)) {
                //console.log(match);
                tags.push({symbol: match[1], locator: indexToLine(text, match.index), path: path});
            }
            // Property functions
            while(match = PROP_FN_REGEX.exec(text)) {
                //console.log(match);
                tags.push({symbol: match[1], locator: indexToLine(text, match.index), path: path});
            }
            ctags.updateCTags(path, tags, callback);
        });
    };
});