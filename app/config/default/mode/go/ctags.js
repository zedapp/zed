var ctags = require("zed/ctags");

var SEL_REGEX = /(func|type)\s*(\([^\)]+\))?\s*([a-zA-Z0-9_\-\$]+)[\s\(]/g;
var indexToLine = require("zed/util").indexToLine;

/**
 * inputs: text
 */
module.exports = function(info) {
    var match;
    var tags = [];
    var path = info.path;
    var text = info.inputs.text;
    // Regular old functions
    while (match = SEL_REGEX.exec(text)) {
        tags.push({
            path: path,
            symbol: match[3],
            locator: indexToLine(text, match.index)
        });
    }

    return ctags.updateCTags(path, tags);
};
