var session = require("zed/session");
var ctags = require("zed/ctags");

var FN_REGEX = /function\s*\*?\s+([a-zA-Z0-9_\-\$]+)\s*\(/mg;
var PROP_FN_REGEX = /([a-zA-Z0-9_\-\$]+)\s*[:=]\s*function\s*\*?\s*\(/mg;
var indexToLine = require("zed/util").indexToLine;

module.exports = function(data, callback) {
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