/* global _ */
module.exports = function(info) {
    var snippets = info.snippets;
    return _.map(snippets, function(snippet, name) {
        return {
            name: name,
            value: name,
            snippet: snippet,
            meta: "snippet",
            score: 999
        };
    });
};
