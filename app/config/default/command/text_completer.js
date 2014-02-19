/* global _ */
define(function(require, exports, module) {
    var session = require("zed/session");
    var Map = require("zed/lib/collection").Map;

    var splitRegex = /[^a-zA-Z_0-9\$\-]+/;

    return function(info, callback) {
        var path = info.path;

        function getWordIndex(pos, callback) {
            session.getTextRange(path, {
                row: 0,
                column: 0
            }, pos, function(err, textBefore) {
                callback(null, textBefore.split(splitRegex).length - 1);
            });
        }

        /**
         * Does a distance analysis of the word `prefix` at position `pos` in `doc`.
         * @return Map
         */
        function wordDistance(text, pos, callback) {
            getWordIndex(pos, function(err, prefixPos) {
                var words = text.split(splitRegex);
                var wordScores = new Map();

                var currentWord = words[prefixPos];

                words.forEach(function(word, idx) {
                    if (!word || word === currentWord) {
                        return;
                    }

                    var distance = Math.abs(prefixPos - idx);
                    var score = words.length - distance;
                    if (wordScores.contains(word)) {
                        wordScores.set(word, Math.max(score, wordScores.get(word)));
                    } else {
                        wordScores.set(word, score);
                    }
                });

                callback(null, wordScores);
            });
        }

        session.getText(path, function(err, text) {
            session.getCursorPosition(path, function(err, pos) {
                wordDistance(text, pos, function(err, wordScores) {
                    var wordList = wordScores.keys();
                    callback(null, wordList.map(function(word) {
                        return {
                            name: word,
                            value: word,
                            score: wordScores.get(word),
                            meta: "local"
                        };
                    }));
                });
            });

        });
    };
});