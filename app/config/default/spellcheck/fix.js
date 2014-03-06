var session = require("zed/session");
var config = require("zed/config");
var dict = require("./dict.js");

var RE_WORD = /[A-Za-z]/;

module.exports = function(info, callback) {
    config.getPreference("spellCheck", function(err, shouldSpellCheck) {
        if (!shouldSpellCheck) {
            return callback(null, []);
        }
        var path = info.path;

        dict.loadDict(function(err, dict) {
            session.getCursorPosition(path, function(err, cursorPos) {
                session.getTextRange(path, {
                    row: cursorPos.row,
                    column: 0
                }, {
                    row: cursorPos.row,
                    column: Infinity
                }, function(err, line) {
                    var currentWord = '';
                    var wordRange = {
                        start: {
                            row: cursorPos.row,
                            column: 0
                        },
                        end: {
                            row: cursorPos.row,
                            column: line.length
                        }
                    };
                    // Find word beginning
                    for (var i = 0; i < cursorPos.column; i++) {
                        var ch = line[i];
                        if (RE_WORD.exec(ch)) {
                            currentWord += ch;
                            if(wordRange.start.column === null) {
                                wordRange.start.column = i;
                            }
                        } else {
                            currentWord = '';
                            wordRange.start.column = null;
                        }
                    }
                    // Append until end of word
                    for (var i = cursorPos.column; i < line.length; i++) {
                        var ch = line[i];
                        if (RE_WORD.exec(ch)) {
                            currentWord += ch;
                        } else {
                            wordRange.end.column = i;
                            break;
                        }
                    }

                    var suggestions = dict.suggest(currentWord);
                    callback(null, suggestions.map(function(suggestion) {
                        return {
                            caption: "Change to '" + suggestion + "'",
                            command: "Tools:Spelling:Change",
                            info: {
                                suggestion: suggestion,
                                range: wordRange
                            }
                        };
                    }));
                });
            });
        });
    });
};