define(function(require, exports, module) {
    "use strict";

    exports.getCompletions = function(edit, session, pos, prefix, callback) {
        var mode = session.mode;
        var matches = [];
        Object.keys(mode.snippets).forEach(function(snippet) {
            if(snippet.indexOf(prefix) === 0) {
                matches.push({
                    name: snippet,
                    value: snippet,
                    snippet: mode.snippets[snippet],
                    meta: "snippet",
                    score: 999
                });
            }
        });
        callback(null, matches);
    };
});
