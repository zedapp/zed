define(function(require, exports, module) {
    var editor = require("../../../editor");
    var Range = ace.require("ace/range").Range;

    function rangify(range) {
        return Range.fromPoints(range.start, range.end);
    }

    return {
        setAnnotations: function(annos, callback) {
            editor.getActiveSession().setAnnotations(annos);
            callback();
        },
        getText: function(callback) {
            callback(null, editor.getActiveEditor().getValue());
        },
        setText: function(text, callback) {
            var session = editor.getActiveSession();
            var range = session.getSelection().getRange();
            range.start.row = 0;
            range.start.column = 0;
            range.end.row = session.getLength();
            var line = session.getLine(range.end.row);
            range.end.column = line.length;

            session.replace(range, text);
            callback();
        },
        getAllLines: function(callback) {
            callback(null, editor.getActiveSession().getDocument().getAllLines());
        },
        getSelectionRange: function(callback) {
            var range = editor.getActiveSession().selection.getRange();
            callback(null, {start: range.start, end: range.end});
        },
        getSelectionText: function(callback) {
            var session = editor.getActiveSession();
            var range = session.selection.getRange();
            callback(null, session.getTextRange(range));
        },
        getTextRange: function(range, callback) {
            callback(null, editor.getActiveSession().getTextRange(rangify(range)));
        },
        getCursorPosition: function(callback) {
            callback(null, editor.getActiveEditor().getCursorPosition());
        },
        setCursorPosition: function(pos, callback) {
            var session = editor.getActiveSession();
            session.selection.clearSelection();
            session.selection.moveCursorToPosition(pos);
            callback();
        },
        getScrollPosition: function(callback) {
            var session = editor.getActiveSession();
            callback(null, {
                scrollTop: session.getScrollTop(),
                scrollLeft: session.getScrollLeft()
            });
        },
        setScrollPosition: function(pos, callback) {
            var session = editor.getActiveSession();
            session.setScrollTop(pos.scrollTop);
            session.setScrollLeft(pos.scrollLeft);
            callback();
        },
        replaceRange: function(range, text, callback) {
            editor.getActiveSession().replace(rangify(range), text);
            callback();
        }
    };
});