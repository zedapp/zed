/* global _ */
var session = require("zed/session");
module.exports = function(info) {
    return session.getPreceedingIdentifier(info.path).then(function(prefix) {
        if (!prefix) {
            return [];
        }
        var snippets = info.snippets;
        return _.map(snippets, function(snippet, name) {
            return {
                name: name,
                value: name,
                snippet: snippet,
                score: Infinity,
                icon: "snippet"
            };

        });
    });
};
