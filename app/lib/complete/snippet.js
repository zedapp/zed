define(function(require, exports, module) {
    "use strict";
    
    var settingsfs = require("../fs/settings");
    module.exports = function(session, pos, prefix, callback) {
        var mode = session.getMode().$id;
        var modeParts = mode.split('/');
        var language = modeParts[modeParts.length - 1];
        settingsfs.readFile("/" + language + "-snippets.json", function(err, jsonText) {
            if(err) {
                return callback(null, []);
            }
            var snippets = JSON.parse(jsonText);
            var matches = [];
            Object.keys(snippets).forEach(function(snippet) {
                if(snippet.indexOf(prefix) === 0) {
                    matches.push({
                        name: snippet,
                        text: snippets[snippet],
                        meta: "snippet",
                        score: 999
                    });
                }
            });
            callback(null, matches);
        });
    };
});