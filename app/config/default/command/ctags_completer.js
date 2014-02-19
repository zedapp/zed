/* global define */
define(function(require, exports, module) {
    var session = require("zed/session");
    var ctags = require("zed/ctags");
    var Map = require("zed/lib/collection").Map;

    return function(info, callback) {
        var path = info.path;
        ctags.getCTags(function(err, tags) {
            session.getPreceedingIdentifier(path, function(err, prefix) {
                var matches = [];
                var matchedSymbols = new Map();
                tags.forEach(function(ctag) {
                    if (ctag.symbol.indexOf(prefix) === 0) {
                        if (matchedSymbols.contains(ctag.symbol)) {
                            return; // Not interested in duplicates
                        }
                        matchedSymbols.set(ctag.symbol, true);
                        var pathParts = ctag.path.split('/');
                        matches.push({
                            name: ctag.symbol,
                            value: ctag.symbol,
                            meta: pathParts[pathParts.length - 1],
                            score: 0
                        });
                    }
                });
                callback(null, matches);
            });
        });
    };
});