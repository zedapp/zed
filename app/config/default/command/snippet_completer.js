/* global _ */
define(function(require, exports, module) {
    var session = require("zed/session");
    return function(info, callback) {
        var path = info.path;
        var snippets = info.snippets;
        session.getPreceedingIdentifier(path, function(err, prefix) {
            console.log("Identifier", prefix);
            var matches = [];
            _.each(snippets, function(snippet, name) {
                if (name.indexOf(prefix) === 0) {
                    matches.push({
                        name: name,
                        value: name,
                        snippet: snippet,
                        meta: "snippet",
                        score: 999
                    });
                }
            });
            callback(null, matches);
        });
    };
});