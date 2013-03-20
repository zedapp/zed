define(function(require, exports, module) {
    "use strict";
    var modes = require("../modes");
    
    module.exports = function(session, pos, prefix, callback) {
        var mode = session.mode;
        var matches = [];
        Object.keys(mode).forEach(function(key) {
            if(key.indexOf("snippet:") === 0) {
                var snippet = key.substring("snippet:".length);
                if(snippet.indexOf(prefix) === 0) {
                    matches.push({
                        name: snippet,
                        text: mode[key],
                        meta: "snippet",
                        score: 999
                    });
                }
            }
        });
        callback(null, matches);
    };
});
