define(function(require, exports, module) {
    var session_manager = require("../../session_manager");
    var Range = require("ace/range").Range;
    var editor = require("../../editor");
    var InlineAnnotation = require("../../lib/inline_annotation");
    var eventbus = require("../../lib/eventbus");

    function rangify(range) {
        return Range.fromPoints(range.start, range.end);
    }

    function getSession(path) {
        var session;
        if (path) {
            session = session_manager.getSessions()[path];
        } else {
            session = editor.getActiveSession();
        }
        return session;
    }

    var identifierRegex = /[a-zA-Z_0-9\$\-]/;

    return {
        goto: function(path, callback) {
            var edit = editor.getActiveEditor();
            session_manager.go(path, edit, edit.getSession(), function(err) {
                callback(err);
            });
        },
        setAnnotations: function(path, annos, callback) {
            var session = getSession(path);
            (session.annotations || []).forEach(function(anno) {
                console.log("Removing anno", anno);
                anno.remove();
            });
            session.annotations = [];
            for(var i = 0; i < annos.length; i++) {
                var anno = annos[i];
                // If no endColum, no inline marker is required
                if(anno.endColumn) {
                    session.annotations.push(new InlineAnnotation(session, anno));
                }
            }
            session.setAnnotations(annos);
            callback();
        },
        getText: function(path, callback) {
            var session = getSession(path);
            if(!session) {
                return callback("No session for: " + path);
            }
            callback(null, session.getValue());
        },
        getBeforeAndAfter: function(path, callback) {
            var session = getSession(path);
            if(!session) {
                return callback("No session for: " + path);
            }
            var text = session.getValue();
            var index = this.getCursorIndex();
            callback(null, text.slice(0, index), index, text.slice(index));
        },
        setText: function(path, text, callback) {
            var session = getSession(path);

            // Save scroll/cursor state
            var scrollTop = session.getScrollTop();
            var scrollLeft = session.getScrollLeft();
            var cursorPos = session.selection.getCursor();

            var lineCount = session.getLength();
            var range = new Range(0, 0, lineCount, session.getLine(lineCount - 1).length);

            session.replace(range, text);

            session.selection.clearSelection();
            session.selection.moveCursorToPosition(cursorPos);
            session.setScrollTop(scrollTop);
            session.setScrollLeft(scrollLeft);
            callback();
        },
        insertAtCursor: function(path, text, callback) {
            var session = getSession(path);
            session.insert(session.selection.getCursor(), text);
            callback();
        },
        insert: function(path, pos, text, callback) {
            var session = getSession(path);
            session.insert(pos, text);
            callback();
        },
        append: function(path, text, callback) {
            var session = getSession(path);
            session.insert({
                row: session.getLength(),
                column: 0
            }, text);
            callback();
        },
        getPreceedingIdentifier: function(path, callback) {
            var session = getSession(path);
            var doc = session.getDocument();
            var pos = session.selection.getCursor();
            var line = doc.getLine(pos.row);

            var identBuf = [];
            for (var i = pos.column - 1; i >= 0; i--) {
                if (identifierRegex.test(line[i])) {
                    identBuf.push(line[i]);
                } else {
                    break;
                }
            }
            callback(null, identBuf.reverse().join(""));
        },
        getAllLines: function(path, callback) {
            callback(null, getSession(path).getDocument().getAllLines());
        },
        getSelectionRange: function(path, callback) {
            var range = getSession(path).selection.getRange();
            callback(null, {
                start: range.start,
                end: range.end
            });
        },
        getSelectionText: function(path, callback) {
            var session = getSession(path);
            var range = session.selection.getRange();
            callback(null, session.getTextRange(range));
        },
        getTextRange: function(path, start, end, callback) {
            callback(null, getSession(path).getTextRange(rangify({start: start, end: end})));
        },
        getCursorIndex: function(path, callback) {
            var session = getSession(path);
            var cursor = session.selection.getCursor();
            var lines = session.getDocument().getAllLines();
            var index = cursor.column;
            lines.splice(cursor.row);
            while (lines.length > 0) {
                index += lines.pop().length + 1;
            }
            callback(null, index);
        },
        setCursorIndex: function(path, index, callback) {
            var session = getSession(path);
            var text = session.getValue().slice(0, index);
            var lines = text.split("\n");
            var pos = {
                row: lines.length - 1,
                column: lines[lines.length - 1].length
            };
            session.selection.clearSelection();
            session.selection.moveCursorToPosition(pos);
            callback();
        },
        getCursorPosition: function(path, callback) {
            callback(null, getSession(path).selection.getCursor());
        },
        setCursorPosition: function(path, pos, callback) {
            var session = getSession(path);
            session.selection.clearSelection();
            session.selection.moveCursorToPosition(pos);
            callback();
        },
        getScrollPosition: function(path, callback) {
            var session = getSession(path);
            callback(null, {
                scrollTop: session.getScrollTop(),
                scrollLeft: session.getScrollLeft()
            });
        },
        setScrollPosition: function(path, pos, callback) {
            var session = getSession(path);
            session.setScrollTop(pos.scrollTop);
            session.setScrollLeft(pos.scrollLeft);
            callback();
        },
        replaceRange: function(path, range, text, callback) {
            var session = getSession(path);
            var cursorPos = session.selection.getCursor();

            session.replace(rangify(range), text);

            session.selection.clearSelection();
            session.selection.moveCursorToPosition(cursorPos);
            callback();
        },
        flashMessage: function(path, message, length, callback) {
            var session = getSession(path);
            eventbus.emit("sessionactivitystarted", session, message);
            setTimeout(function() {
                eventbus.emit("sessionactivitycompleted", session);
            }, length);
            callback();
        }
    };
});
