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
    session.goto("zed::search").then(function() {
        return fs.listFiles();
    }).then(function(fileList_) {
        fileList = fileList_;
        fileList = fileList.filter(function(filename) {
            var parts = filename.split('.');
            var ext = parts[parts.length - 1];
            return filterExtensions.indexOf(ext) === -1;
        });

        session.setText("zed::search", "Searching " + fileList.length + " files for '" + phrase + "'...\nPut your cursor on the result press Enter to jump.\n");
        var filePromises = fileList.map(function(path) {
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
                while ((matchIdx = text.indexOf(phrase, matchIdx)) !== -1) {
                    append("\n" + path + ":" + indexToLine(text, matchIdx) + "\n\t" + getLine(text, matchIdx) + "\n");
                    matchIdx++;
                    results++;
                    if (results >= MAX_RESULTS) {
                        break;
                    }
                }
            }, function(err) {
                console.error("Could not read file: " + path);
                // If a few files fail that's ok, just report
            });
        });
        return Promise.all(filePromises);
    }).then(function() {
        if (results === 0) {
            append("\nNo results found.");
        } else {
            append("\nFound " + results + " results.");
        }
    }).
    catch (function(err) {
        console.error("Got error", err);
        throw err;
    });
};
