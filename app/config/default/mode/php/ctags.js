/*global define*/
define(function(require, exports, module) {
    var session = require("zed/session");
    var ctags = require("zed/ctags");

    var FN_REGEX = /(class|function)\s+([a-zA-Z0-9_\$]+)\s*[\(\{]/mg;
    var indexToLine = require("zed/util").indexToLine;

    return function(data, callback) {
        var match;
        var tags = [];
        var path = data.path;
        session.getText(path, function(err, text) {
            // Classes and functions
            while(match = FN_REGEX.exec(text)) {
                //console.log(match);
                tags.push({symbol: match[2], locator: indexToLine(text, match.index), path: path});
            }
            ctags.updateCTags(path, tags, callback);
        });
    };
});