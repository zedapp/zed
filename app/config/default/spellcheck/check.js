var session = require("zed/session");
var config = require("zed/config");
var indexToPos = require("zed/util").indexToPos;
var dict = require("./dict.js");

var RE_WORD = /[A-Za-z]/;

return function(info, callback) {
    config.getPreference("spellCheck", function(err, shouldSpellCheck) {
        if(!shouldSpellCheck) {
            return callback(null, []);
        }
        var path = info.path;
        
        dict.loadDict(function(err, dict) {
            session.getText(path, function(err, text) {
                if(err) {
                    return callback("Error while spell checking: " + err);
                }
                var words = textToWordsWithPositions(text);
                var errors = [];
                words.forEach(function(word) {
                    if(!dict.check(word.word)) {
                        var startPos = indexToPos(text, word.start);
                        var endPos = indexToPos(text, word.end);
                        errors.push({
                            row: startPos.row,
                            column: startPos.column,
                            endColumn: endPos.column,
                            type: 'error',
                            text: "Misspelling: " + word.word,
                            word: word
                        });
                    }
                });
                callback(null, errors);
            });
        });
    });
};

function textToWordsWithPositions(text) {
    var word = '';
    var words = [];
    var wordStart = -1;
    for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        if (RE_WORD.exec(ch)) {
            word += ch;
            if (wordStart === -1) {
                wordStart = i;
            }
        } else if (wordStart !== -1) {
            words.push({
                word: word,
                start: wordStart,
                end: i
            });
            wordStart = -1;
            word = '';
        }
    }
    return words;
}