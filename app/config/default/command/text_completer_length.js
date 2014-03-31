/* global _ */
var session = require("zed/session");
var Map = require("zed/lib/collection").Map;

var splitRegex = /[^a-zA-Z_0-9\$\-]+/;

module.exports = function(info) {
    var path = info.path;

    return session.getText(path).then(function(text) {
        text = text;
        var words = text.split(splitRegex);
        var wordScores = new Map();

        words.forEach(function(word) {
            wordScores.set(word, 100 * Math.max(0, 100 - word.length));
        });

        var wordList = wordScores.keys();
        return wordList.map(function(word) {
            return {
                name: word,
                value: word,
                score: wordScores.get(word),
                meta: "local"
            };
        });
    });
};
