/*global define*/
define(function(require, exports, module) {
    var SEL_REGEX = /[\.#]([a-zA-Z0-9_\-\$]+)[\s\{\.]/g;
    
    function indexToLine(text, index) {
        var s = text.substring(0, index);
        return s.split("\n").length;
    }
    
    return function(options, content, callback) {
        var match;
        var tags = [];
        // Regular old functions
        while(match = SEL_REGEX.exec(content)) {
            tags.push({symbol: match[1], locator: indexToLine(content, match.index)});
        }
        callback(null, tags);
    };
});