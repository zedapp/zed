define(function(require, exports, module) {
    var ui = require("zed/ui");
    var project = require("zed/project");
    var session = require("zed/session");
    var async = require("zed/lib/async");

    var filterExtensions = ["pdf", "gz", "tgz", "bz2", "zip",
        "exe", "jpg", "jpeg", "gif", "png"];

    function indexToLine(text, index) {
        var s = text.substring(0, index);
        return s.split("\n").length;
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

    return function(info, callback) {
        ui.prompt("Phrase to search for:", "", 300, 150, function(err, phrase) {
            if (!phrase) {
                return callback();
            }
            session.goto("zed::search", function() {
                function append(text) {
                    session.append("zed::search", text, function() {});
                }

                var results = 0;

                project.listFiles(function(err, fileList) {
                    fileList = fileList.filter(function(filename) {
                        var parts = filename.split('.');
                        var ext = parts[parts.length - 1];
                        return filterExtensions.indexOf(ext) === -1;
                    });

                    session.setText("zed::search", "Searching " + fileList.length + " files for '" + phrase + "'...\nPut your cursor on the result press Enter to jump.\n", function() {});
                    async.eachLimit(fileList, 10, function(path, next) {
                        if (results >= MAX_RESULTS) {
                            return next();
                        }

                        if (path === "/tags") {
                            return next();
                        }

                        project.readFile(path, function(err, text) {
                            if (err) {
                                console.error(path, err);
                                return next();
                            }
                            if (!stringIsText(text)) {
                                return next();
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
                            next();
                        });
                    }, function() {
                        if (results === 0) {
                            append("\nNo results found.");
                        } else {
                            append("\nFound " + results + " results.");
                        }
                        callback();
                    });
                });
            });
        });
    };
});