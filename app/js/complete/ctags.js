/*global define*/
define(function(require, exports, module) {
    "use strict";
    var Map = require("../lib/collection").Map;
    var ctags = require("../ctags");
    
    exports.getCompletions = function(edit, session, pos, prefix, callback) {
        var tags = ctags.getCTags();
        var matches = [];
        var matchedSymbols = new Map();
        tags.forEach(function(ctag) {
            if(ctag.symbol.indexOf(prefix) === 0) {
                if(matchedSymbols.contains(ctag.symbol)) {
                    return; // Not interested in duplicates
                }
                matchedSymbols.set(ctag.symbol, true);
                var pathParts = ctag.path.split('/');
                matches.push({
                    name: ctag.symbol,
                    value: ctag.symbol,
                    meta: pathParts[pathParts.length-1],
                    score: 0
                });
            }
        });
        callback(null, matches);
    };
});