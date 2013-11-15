/* global _ */
define(function(require, exports, module) {
    var session = require("zed/session");
    return function(info, callback) {
        var path = info.path;
        var snippets = info.snippets;
        callback(null, _.map(snippets, function(snippet, name) {
            return {
                name: name,
                value: name,
                snippet: snippet,
                meta: "snippet",
                score: 999
            };
        }));
    };
});