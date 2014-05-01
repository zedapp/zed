var symbol = require("zed/symbol");

/*
  These symbols are rough at best
  use livescript lexer/tokenizer output insead?

  If the livescript AST output had line numbers that
  would be perfect.
*/
var FN_REGEX = /((?![\d\s])[$\w\xAA-\uFFDC](?:(?!\s)[$\w\xAA-\uFFDC]|-[A-Za-z])*)\s*(=|:|!=|\?=)/g;
var indexToLine = require("zed/util").indexToLine;

/**
 * inputs: text
 */
module.exports = function(info) {
    var match;
    var path = info.path;
    var tags = [];
    var text = info.inputs.text;
    // Regular old functions
    while (match = FN_REGEX.exec(text)) {
        tags.push({
            path: path,
            symbol: match[1],
            locator: indexToLine(text, match.index)
        });
    }
    return symbol.updateSymbols(path, tags);
};
