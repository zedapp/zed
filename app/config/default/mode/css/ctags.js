var ctags = require("zed/ctags");

var util = require("zed/util");
var SEL_REGEX = /[\.#]([a-zA-Z0-9_\-\$]+)[\s\{\.]/g;

return function(info) {
    var match;
    var tags = [];
    var path = info.path;
    var text = info.inputs.text;
    // Regular old functions
    while (match = SEL_REGEX.exec(text)) {
        tags.push({
            symbol: match[1],
            locator: util.indexToLine(text, match.index),
            path: path
        });
    }
    return ctags.updateCTags(path, tags);
};
