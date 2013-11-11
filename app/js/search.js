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

    exports.search = function(phrase, edit) {
        session_manager.go("zed:search", edit, edit.getSession());
        var session = session_manager.getSessions()["zed:search"];
        session.dontPersist = true;
        var resultText = "Search results for '" + phrase + "'\n==============================\nPut your cursor on the path and press Command-Shift-E/Ctrl-Shift-E and Enter to navigate to the result.\n";

        function update() {
            session.setValue(resultText);
        }

        var foundResult = false;

        project.listFiles(function(err, fileList) {
            // Only search in files we have a mode for (may be a bad assumption)
            fileList = fileList.filter(function(path) {
                return !modes.getModeForPath(path).isFallback;
            });
            async.forEach(fileList, function(path, next) {
                project.readFile(path, function(err, text) {
                    if(err) {
                        console.error(path, err);
                        return next();
                    }
                    var matchIdx = 0;
                    while((matchIdx = text.indexOf(phrase, matchIdx)) !== -1) {
                        resultText += "\n" + path + ":" + indexToLine(text, matchIdx) + "\n\tSnippet: " + getLine(text, matchIdx) + "\n";
                        matchIdx++;
                        foundResult = true;
                    }
                    update();
                    next();
                });
            }, function() {
                if(!foundResult) {
                    resultText += "\nNo results found.";
                    update();
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