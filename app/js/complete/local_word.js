define(function(require, exports, module) {
    "use strict";

    var Map = require("../lib/collection").Map;
    
    var splitRegex = /[^a-zA-Z_0-9\$\-]+/;

    function getWordIndex(doc, pos) {
        var textBefore = doc.getLines(0, pos.row - 1).join("\n") + "\n";
        var line = doc.getLine(pos.row);
        textBefore += line.substr(0, pos.column);
        return textBefore.trim().split(splitRegex).length - 1;
    }

    // NOTE: Naive implementation O(n), can be O(log n) with binary search
    function filterPrefix(prefix, words) {
        var results = [];
        for (var i = 0; i < words.length; i++) {
            if (words[i].indexOf(prefix) === 0) {
                results.push(words[i]);
            }
        }

        return results;
    }

    /**
     * Does a distance analysis of the word `prefix` at position `pos` in `doc`.
     * @return Map
     */
    function wordDistance(doc, pos) {
        var prefixPos = getWordIndex(doc, pos);
        var words = doc.getValue().split(splitRegex);
        var wordScores = new Map();

        var currentWord = words[prefixPos];

        words.forEach(function(word, idx) {
            if (!word || word === currentWord) return;

            var distance = Math.abs(prefixPos - idx);
            var score = words.length - distance;
            if (wordScores.contains(word)) {
                wordScores.set(word, Math.max(score, wordScores.get(word)));
            } else {
                wordScores.set(word, score);
            }

        });
        return wordScores;
    }

    module.exports = function(session, pos, prefix, callback) {
        var wordScore = wordDistance(session.getDocument(), pos, prefix);
        var wordList = filterPrefix(prefix, wordScore.keys());
        callback(null, wordList.map(function(word) {
            return {
                name: word,
                text: word,
                score: wordScore.get(word),
                meta: "local"
            };
        }));
    };
});