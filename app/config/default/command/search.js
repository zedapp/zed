var ui = require("zed/ui");
var fs = require("zed/fs");
var session = require("zed/session");

var filterExtensions = ["pdf", "gz", "tgz", "bz2", "zip",
    "exe", "jpg", "jpeg", "gif", "png"];

function indexToLine(text, index) {
    var s = text.substring(0, index);
    return (s.match(/\n/g) || []).length + 1;
}

function getLine(text, index) {
    var line = indexToLine(text, index);
    var lines = text.split("\n");
    return lines[line - 1].trim();
}

var MAX_RESULTS = 1000;

/**
 * Function to check if the string is text or binary, based on the
 * answers here:
 *   http://stackoverflow.com/questions/10225399/check-if-a-file-is-binary-or-ascii-with-node-js
 */
function stringIsText(text) {
    var isText = true;
    var sampleSize = Math.min(100, text.length);
    for (var i = 0; i < sampleSize; i++) {
        var charCode = text.charCodeAt(i);
        if (charCode === 65533 || charCode <= 8) {
            isText = false;
            break;
        }
    }
    return isText;
}

function phraseParser(phrase) {
    var text = '';
    var quoted = false;
    var regex = false;
    var caseInsensitive = false;
    // The search phrase part
    for (var i = 0; i < phrase.length; i++) {
        if (i === 0 && phrase[i] === '"') {
            quoted = true;
        } else if (phrase[i] === '"') {
            i++;
            break;
        } else if (quoted) {
            text += phrase[i];
        } else if (phrase[i] === ' ') {
            break;
        } else {
            text += phrase[i];
        }
    }
    skipWhitespace();
    if (phrase[i] === '-') { // options
        i++;
        forloop: for (; i < phrase.length; i++) {
            switch (phrase[i]) {
                case 'i':
                    caseInsensitive = true;
                    break;
                case 'e':
                    regex = true;
                    break;
                default:
                    break forloop;
            }
        }
    }
    skipWhitespace();
    var pathPattern = phrase.substring(i);
    return {
        text: text,
        regex: regex,
        caseInsensitive: caseInsensitive,
        pathPattern: pathPattern
    };

    function skipWhitespace() {
        while (phrase[i] === ' ') {
            i++;
        }
    }
}

function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function wildcardToRegexp(str) {
    str = escapeRegExp(str);
    str = str.replace(/\\\*/g, ".*");
    return "^" + str + "$";
}

module.exports = function(info) {
    var phrase = info.phrase;

    function append(text) {
        session.append("zed::search", text, function() {});
    }
    var results = 0;
    var fileList;
    if (!phrase) {
        // Need to throw to jump out here
        return;
    }
    var parsedPhrase = phraseParser(phrase);
    console.log("Parsed phrase", parsedPhrase);
    session.goto("zed::search").then(function() {
        return fs.listFilesOfKnownFileTypes();
    }).then(function(fileList_) {
        var pathRegex = new RegExp(wildcardToRegexp(parsedPhrase.pathPattern));

        fileList = fileList_;
        fileList = fileList.filter(function(filename) {
            return parsedPhrase.pathPattern ? pathRegex.exec(filename) : true;
        });
        session.setText("zed::search", "Searching " + fileList.length + " files for '" + parsedPhrase.text + "'...\nPut your cursor on the result press Enter to jump.\n");

        var phraseText = parsedPhrase.text;
        if (parsedPhrase.regex) {
            var phraseRegex = new RegExp(parsedPhrase.text, "g");
        }
        if (parsedPhrase.caseInsensitive) {
            phraseText = phraseText.toLowerCase();
        }
        fileList.reverse();

        function searchFile() {
            var path = fileList.pop();
            if (!path) {
                return;
            }
            if (results >= MAX_RESULTS) {
                return;
            }

            if (path === "/tags" || path.indexOf("zed::") === 0) {
                return;
            }

            return fs.readFile(path).then(function(text) {
                if (!stringIsText(text)) {
                    return;
                }
                var matchIdx = 0;
                var searchText = parsedPhrase.caseInsensitive ? text.toLowerCase() : text;
                if (parsedPhrase.regex) {
                    var lines = searchText.split("\n");
                    var m;
                    for (var i = 0; i < lines.length; i++) {
                        while (m = phraseRegex.exec(lines[i])) {
                            append("\n" + path + ":" + (i + 1) + "\n\t" + lines[i] + "\n");
                            results++;
                            if (results >= MAX_RESULTS) {
                                break;
                            }
                        }
                    }
                } else {
                    while ((matchIdx = searchText.indexOf(phraseText, matchIdx)) !== -1) {
                        append("\n" + path + ":" + indexToLine(text, matchIdx) + "\n\t" + getLine(text, matchIdx) + "\n");
                        matchIdx++;
                        results++;
                        if (results >= MAX_RESULTS) {
                            break;
                        }
                    }
                }
            }, function() {
                console.error("Could not read file: " + path);
                // If a few files fail that's ok, just report
            }).then(function() {
                return searchFile();
            });
        }


        return searchFile();
    }).then(function() {
        if (results === 0) {
            append("\nNo results found.");
        } else {
            append("\nFound " + results + " results.");
        }
    }).
    catch (function(err) {
        console.error("Got error", err);
        append("\nGot error: " + err.message);
        throw err;
    });
};
