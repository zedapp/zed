/*global define*/
define(function(require, exports, module) {
    var SEL_REGEX = /(func|type)\s*(\([^\)]+\))?\s*([a-zA-Z0-9_\-\$]+)[\s\(]/g;
    var indexToLine = require("./util.js").indexToLine;
    
    return function(options, content, callback) {
        var match;
        var tags = [];
        // Regular old functions
        while(match = SEL_REGEX.exec(content)) {
            tags.push({symbol: match[3], locator: indexToLine(content, match.index)});
        }
        
        callback(null, tags);
    };
});