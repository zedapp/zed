var ctags = require("zed/ctags");

var PRED_REGEX = /([a-zA-Z0-9_\-\$]+)\s*=/g;
var indexToLine = require("zed/util").indexToLine;

module.exports = function(info) {
    var match;
    var tags = [];
    var path = info.path;
    var text = info.inputs.text;
    // Regular old functions
    while (match = PRED_REGEX.exec(text)) {
        tags.push({
            path: path,
            symbol: match[1],
            locator: indexToLine(text, match.index)
        });
    }
    return ctags.updateCTags(path, tags);
};
