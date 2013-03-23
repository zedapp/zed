define(function(require, exports, module) {
    var eventbus = require("../lib/eventbus");
    var editor = require("../editor");
    var command = require("../command");
    var tools = require("../tools");

    function beautify(session) {
        eventbus.emit("sessionactivitystarted", session, "Beautifying");
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
                return eventbus.emit("sessionactivityfailed", session, "Beautification not supported.");
            }
            session.replace(range, reformattedText);
            edit.clearSelection();
            edit.moveCursorToPosition(cursorPos);
            eventbus.emit("sessionactivitycompleted", session);
        });
    }

    command.define("Tools:Beautify", {
        exec: function(edit) {
            beautify(edit.getSession());
        }
    });
});
