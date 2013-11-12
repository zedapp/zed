define(function(require, exports, module) {
    var project = require("./project");
    var async = require("./lib/async");
    var modes = require("./modes");
    var session_manager = require("./session_manager");
    var command = require("./command");
    var editor = require("editor");

    function indexToLine(text, index) {
        var s = text.substring(0, index);
        return s.split("\n").length;
    }

    function getLine(text, index) {
        var line = indexToLine(text, index);
        var lines = text.split("\n");
        return lines[line-1].trim();
    }

    var MAX_RESULTS = 1000;

    exports.search = function(phrase, edit) {
        session_manager.go("zed:search", edit, edit.getSession());
        var session = session_manager.getSessions()["zed:search"];
        session.dontPersist = true;

        function append(text) {
            session.insert({row: session.getLength(), column: 0}, text);
        }

        var results = 0;

        project.listFiles(function(err, fileList) {
            // Only search in files we have a mode for (may be a bad assumption)
            fileList = fileList.filter(function(path) {
                return !modes.getModeForPath(path).isFallback;
            });
            session.setValue("Searching " + fileList.length + " files for '" + phrase + "'...\nPut your cursor on the path and press Command-Shift-E/Ctrl-Shift-E and Enter to navigate to the result.\n");
            async.forEach(fileList, function(path, next) {
                if(results >= MAX_RESULTS) {
                    return next();
                }
                project.readFile(path, function(err, text) {
                    if(err) {
                        console.error(path, err);
                        return next();
                    }
                    var matchIdx = 0;
                    while((matchIdx = text.indexOf(phrase, matchIdx)) !== -1) {
                        append("\n" + path + ":" + indexToLine(text, matchIdx) + "\n\t\"" + getLine(text, matchIdx) + "\"\n");
                        matchIdx++;
                        results++;
                        if(results >= MAX_RESULTS) {
                            break;
                        }
                    }
                    next();
                });
            }, function() {
                if(results === 0) {
                    append("\nNo results found.");
                } else {
                    append("\nFound " + results + " results.");
                }
            });
        });
    };

    command.define("Find:Find In Project", {
        exec: function(edit, session) {
            command.exec("Navigate:Goto", edit, session, "//");
        },
        readOnly: true
    });

    command.define("Find:Find Identifier Under Cursor In Project", {
        exec: function(edit) {
            var identifier = editor.getIdentifierUnderCursor(edit);
            exports.search(identifier, edit);
        },
        readOnly: true
    });
});