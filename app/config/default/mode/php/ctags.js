var ctags = require("zed/ctags");
var indexToLine = require("zed/util").indexToLine;

var FN_REGEX = /(class|function)\s+([a-zA-Z0-9_\$]+)\s*[\(\{]/mg;

module.exports = function(info, callback) {
    var match;
    var tags = [];
    var path = info.path;
    var text = info.inputs.text;
    // Classes and functions
    while (match = FN_REGEX.exec(text)) {
        //console.log(match);
        tags.push({
            symbol: match[2],
            locator: indexToLine(text, match.index),
            path: path
        });
    }
    ctags.updateCTags(path, tags, callback);
};
