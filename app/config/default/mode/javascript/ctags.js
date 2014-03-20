var ctags = require("zed/ctags");

var FN_REGEX = /function\s*\*?\s+([a-zA-Z0-9_\-\$]+)\s*\(/mg;
var PROP_FN_REGEX = /([a-zA-Z0-9_\-\$]+)\s*[:=]\s*function\s*\*?\s*\(/mg;
var indexToLine = require("zed/util").indexToLine;

/**
 * Required inputs: text
 */
module.exports = function(info, callback) {
    var path = info.path;
    var text = info.inputs.text;
    var match;
    var tags = [];
    // Regular old functions
    while (match = FN_REGEX.exec(text)) {
        tags.push({
            symbol: match[1],
            locator: indexToLine(text, match.index),
            path: path
        });
    }
    // Property functions
    while (match = PROP_FN_REGEX.exec(text)) {
        tags.push({
            symbol: match[1],
            locator: indexToLine(text, match.index),
            path: path
        });
    }
    ctags.updateCTags(path, tags, callback);
};
