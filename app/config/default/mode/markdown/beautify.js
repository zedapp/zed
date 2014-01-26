/*global define*/
define(function(require, exports, module) {
    var beautify = require("zed/lib/beautify");

    var whitespaceRe = /\s/;
    var emptyRe = /^\s*$/;
    var listRe = /^\s*(\*\s|\d+\.\s)/;

    function isEmpty(line) {
        return emptyRe.test(line);
    }

    function getIndent(line) {
        var s = "";
        var i = 0;
        while (whitespaceRe.test(line[i])) {
            s += line[i];
            i++;
        }
        return s;
    }

    function getListIndent(line) {
        var match = listRe.exec(line);
        if (match) {
            var len = match[1].length;
            var s = "";
            for (var i = 0; i < len; i++) {
                s += " ";
            }
            return s;
        } else {
            return "";
        }
    }

    return function(data, callback) {
        beautify(data.path, function(content, callback) {
            var width = 80;
            var lines = content.split("\n");

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (line.length > width) {
                    var breakIndex = width;
                    while (!whitespaceRe.test(line[breakIndex]) && breakIndex > 0) {
                        breakIndex--;
                    }
                    if (breakIndex === 0) {
                        if (!whitespaceRe.test(line[breakIndex])) {
                            // Too long to cut properly, let's find the first whitespace point
                            while (!whitespaceRe.test(line[breakIndex]) && breakIndex < line.length) {
                                breakIndex++;
                            }
                            if (breakIndex === line.length) {
                                // Nothing we can do here
                                continue;
                            }
                        } else {
                            continue;
                        }
                    }
                    lines[i] = line.substring(0, breakIndex);
                    var newLine = line.substring(breakIndex + 1);

                    if (line[0] === ">") {
                        // Blockquote
                        newLine = "> " + newLine;
                    }

                    // List
                    newLine = getListIndent(line) + newLine;

                    // Keep indent level going;
                    newLine = getIndent(line) + newLine;

                    var nextLine = lines[i + 1];
                    if (isEmpty(nextLine) || getListIndent(nextLine)) {
                        // Wrap over to a new line
                        lines.splice(i + 1, 0, newLine);
                    } else {
                        // Prefix it
                        lines[i + 1] = newLine + " " + nextLine.replace(/^\s+/, '');
                    }
                }
            }

            callback(null, lines.join("\n"));
        }, callback);
    };
});