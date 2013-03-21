define(function(require, exports, module) {
    var eventbus = require("./eventbus");
    var editor = require("./editor");
    var command = require("./command");
    var tools = require("./tools");

    /*var beautifiers = exports.beautifiers = {
        "css": require("util/beautify-css"),
        "javascript": require("util/beautify-javascript"),
        "json": require("util/beautify-javascript"),
        "html": require("util/beautify-html")
    };*/
    
    function beautify(session) {
        var range = session.getSelection().getRange();
        var edit = editor.getActiveEditor();
        var cursorPos = edit.getCursorPosition();
        if(range.isEmpty()) {
            range.start.row = 0;
            range.start.column = 0;
            range.end.row = session.getLength();
            range.end.column = session.getLine(range.end.row-1).length;
        }
        range.start.column = 0;
        var line = session.getLine(range.end.row);
        range.end.column = line.length;
        var text = session.getTextRange(range);
        tools.run(session, "beautify", {}, text, function(err, reformattedText) {
            if(err) {
                return console.error("Beautify:", err);
            }
            session.replace(range, reformattedText);
            edit.clearSelection();
            edit.moveCursorToPosition(cursorPos);
        });
    }

    /*function beautify(session) {
        var language = session.mode.language;
        if (beautifiers[language]) {
            var range = session.getSelection().getRange();
            var edit = editor.getActiveEditor();
            var cursorPos = edit.getCursorPosition();
            if(range.isEmpty()) {
                range.start.row = 0;
                range.start.column = 0;
                range.end.row = session.getLength();
                range.end.column = session.getLine(range.end.row-1).length;
            }
            range.start.column = 0;
            var line = session.getLine(range.end.row);
            range.end.column = line.length;
            var text = session.getTextRange(range);
            var reformattedText = beautifiers[language](text);
            session.replace(range, reformattedText);
            edit.clearSelection();
            edit.moveCursorToPosition(cursorPos);
        }
    }*/

    command.define("Edit:Beautify", {
        exec: function(edit) {
            beautify(edit.getSession());
        }
    });
});