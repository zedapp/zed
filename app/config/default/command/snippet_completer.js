/* global _ */
module.exports = function(info, callback) {
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