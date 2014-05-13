var symbol = require("zed/symbol");
var indexToLine = require("zed/util").indexToLine;

/**
 * inputs: text
 */
module.exports = function(info) {
    var tags = [];
    var regexInfos = info.regexes;
    var path = info.path;
    var debug = info.debug;
    var text = info.inputs.text;
    var iterations = 0;
    // Regular old functions
    regexInfos.forEach(function(regexInfo) {
        var match;
        var regex = new RegExp(regexInfo.regex, "g");
        if(debug) {
            console.log("Now searching for:", regex);
        }
        while (match = regex.exec(text)) {
            if(debug) {
                console.log("Got a match", match);
            }
            tags.push({
                path: path,
                symbol: match[regexInfo.symbolIndex],
                locator: indexToLine(text, match.index),
                type: regexInfo.type
            });
            iterations++;
            if(iterations > 10000) {
                return console.error("Too many results, jumping out");
            }
        }

    });

    return symbol.updateSymbols(path, tags);
};
