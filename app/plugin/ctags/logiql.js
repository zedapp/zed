/*global define*/
define(function(require, exports, module) {
    var PRED_REGEX = /([a-zA-Z0-9_\-\$]+)\s*[\(\[]([a-zA-Z0-9_\-\$]+(,\s*)?)*[\)\]].*\->/g;
    var indexToLine = require("./util.js").indexToLine;

    return function(options, content, callback) {
        var match;
        var tags = [];
        // Regular old functions
        while (match = PRED_REGEX.exec(content)) {
            tags.push({
                symbol: match[1],
                locator: indexToLine(content, match.index)
            });
        }
        callback(null, tags);
    };
});