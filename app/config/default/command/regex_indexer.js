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
        var m;
        var regex = new RegExp(regexInfo.regex, "mg");
        if(debug) {
            console.log("Now searching for:", regexInfo.regex);
        }
        while (m = regex.exec(text)) {
            if(debug) {
                console.log("Got a match", m);
            }
            var symbol;
            if(regexInfo.expr) {
                symbol = eval(regexInfo.expr);
            } else {
                symbol = m[regexInfo.symbolIndex];
            }
            tags.push({
                path: path,
                symbol: symbol,
                locator: indexToLine(text, m.index),
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
