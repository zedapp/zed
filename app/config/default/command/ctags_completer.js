var session = require("zed/session");
var ctags = require("zed/ctags");
var Map = require("zed/lib/collection").Map;

module.exports = function(info) {
    var path = info.path;

    return session.getPreceedingIdentifier(path).then(function(prefix) {
        return ctags.getCTags({
            prefix: prefix
        });
    }).then(function(tags) {
        var matches = [];
        var matchedSymbols = new Map();
        tags.forEach(function(ctag) {
            if (matchedSymbols.contains(ctag.symbol)) {
                return; // Not interested in duplicates
            }
            matchedSymbols.set(ctag.symbol, true);
            var pathParts = ctag.path.split('/');
            var parenPos = ctag.symbol.indexOf('(');
            // If we have a symbol with parentheses, empty the argument list
            // when inserting, and complete it as a snippet, putting the cursor
            // in between the parentheses.
            if (parenPos !== -1) {
                matches.push({
                    name: ctag.symbol,
                    value: ctag.symbol,
                    snippet: ctag.symbol.substring(0, parenPos).replace("$", "\\$") + "(${1})",
                    meta: pathParts[pathParts.length - 1],
                    score: 0,
                    icon: "function"
                });
            } else {
                matches.push({
                    name: ctag.symbol,
                    value: ctag.symbol,
                    meta: pathParts[pathParts.length - 1],
                    score: 1,
                    icon: "function"
                });
            }
        });
        return matches;
    });
};
