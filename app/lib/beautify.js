define(function(require, exports, module) {
    var eventbus = require("./eventbus");
    var editor = require("./editor");
    var command = require("./command");

    var beautifiers = exports.beautifiers = {
        "ace/mode/css": require("util/beautify-css"),
        "ace/mode/javascript": require("util/beautify-javascript"),
        "ace/mode/json": require("util/beautify-javascript"),
        "ace/mode/html": require("util/beautify-html")
    };

    function beautify(session) {
        var mode = session.mode;
        if (beautifiers[mode]) {
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
            var reformattedText = beautifiers[mode](text);
            session.replace(range, reformattedText);
            edit.clearSelection();
            edit.moveCursorToPosition(cursorPos);
        }
    }

    command.define("Edit:Beautify", {
        exec: function(edit) {
            beautify(edit.getSession());
        }
    });
});