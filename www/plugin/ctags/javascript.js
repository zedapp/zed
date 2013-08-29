/*global define*/
define(function(require, exports, module) {
    var FN_REGEX = /function\s+([a-zA-Z0-9_\-\$]+)\s*\(/g;
    var PROP_FN_REGEX = /([a-zA-Z0-9_\-\$]+)\s*[:=]\s*function\s*\(/g;
    var indexToLine = require("./util.js").indexToLine;
    
    return function(options, content, callback) {
        var match;
        var tags = [];
        // Regular old functions
        while(match = FN_REGEX.exec(content)) {
            //console.log(match);
            tags.push({symbol: match[1], locator: indexToLine(content, match.index)});
        }
        // Property functions
        while(match = PROP_FN_REGEX.exec(content)) {
            //console.log(match);
            tags.push({symbol: match[1], locator: indexToLine(content, match.index)});
        }
        callback(null, tags);
    };
});