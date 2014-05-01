var symbol = require("zed/symbol");

var FN_REGEX = /([a-zA-Z0-9_\-\$]+)\s*[=:]\s*\([a-zA-Z0-9_\-\$]+/g;
var indexToLine = require("zed/util").indexToLine;

/**
 * inputs: text
 */
module.exports = function(info) {
    var match;
    var path = info.path;
    var tags = [];
    var text = info.inputs.text;
    // Regular old functions
    while (match = FN_REGEX.exec(text)) {
        tags.push({
            path: path,
            symbol: match[1],
            locator: indexToLine(text, match.index)
        });
    }
    return symbol.updateSymbols(path, tags);
};
