var ctags = require("zed/ctags");
var indexToLine = require("zed/util").indexToLine;

var FN_REGEX = /(class|def)\s+([^\d\W]\w*)\s*[\(\:]/mg;

module.exports = function(info) {
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
    return ctags.updateCTags(path, tags);
};
