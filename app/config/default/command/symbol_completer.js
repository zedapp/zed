var session = require("zed/session");
var symbol = require("zed/symbol");
var Map = require("zed/lib/collection").Map;

module.exports = function(info) {
    var path = info.path;

    return session.getPreceedingIdentifier(path).then(function(prefix) {
        return symbol.getSymbols({
            prefix: prefix,
            limit: 200
        });
    }).then(function(symbols) {
        var matches = [];
        var matchedSymbols = new Map();
        symbols.forEach(function(symbol) {
            if (matchedSymbols.contains(symbol.symbol)) {
                return; // Not interested in duplicates
            }
            matchedSymbols.set(symbol.symbol, true);
            var pathParts = symbol.path.split('/');
            var parenPos = symbol.symbol.indexOf('(');
            // If we have a symbol with parentheses, empty the argument list
            // when inserting, and complete it as a snippet, putting the cursor
            // in between the parentheses.
            if (parenPos !== -1) {
                matches.push({
                    name: symbol.symbol,
                    value: symbol.symbol,
                    snippet: symbol.symbol.substring(0, parenPos).replace("$", "\\$") + "(${1})",
                    meta: pathParts[pathParts.length - 1],
                    score: 1,
                    icon: "function"
                });
            } else {
                matches.push({
                    name: symbol.symbol,
                    value: symbol.symbol,
                    meta: pathParts[pathParts.length - 1],
                    score: 1,
                    icon: "function"
                });
            }
        });
        return matches;
    });
};
