/*global define, zed*/
define(function(require, exports, module) {
    var Range = require("ace/range").Range;
    var InlineAnnotation = require("../../lib/inline_annotation");

    function rangify(range) {
        return Range.fromPoints(range.start, range.end);
    }

    function getSession(path) {
        var session = path ? zed.getService("session_manager").getSessions()[path] : zed.getService("editor").getActiveSession();
        if(!session) {
            console.error("Could not get session:", path);
            // TODO once we switch this to promises
        }
        return session;
    }

    // This function can take any defined inputable, a path, a callback,
    // and will call the callback with the result of the inputable for
    // the given path.
    function genericInputable(inputable, path, callback) {
        callback(null, zed.getService("sandbox").getInputable(
            getSession(path), inputable));
    }

    // This returns the above function bound to a given inputable, eg a function
    // that will take only path and callback arguments (as expected below), and
    // then call the callback with the result for the pre-determined inputable.
    function useInputable(inputable) {
        return genericInputable.bind(genericInputable, inputable);
    }

    var identifierRegex = /[a-zA-Z_0-9\$\-]/;

    return {
        getAllLines: useInputable("lines"),
        getCursorIndex: useInputable("cursorIndex"),
        getCursorPosition: useInputable("cursor"),
        getScrollPosition: useInputable("scrollPosition"),
        getSelectionRange: useInputable("selectionRange"),
        getSelectionText: useInputable("selectionText"),
        getText: useInputable("text"),
        isInsertingSnippet: useInputable("isInsertingSnippet"),
        callCommand: function(path, command, callback) {
            zed.getService("command").exec(
                command,
                zed.getService("editor").getActiveEditor(),
                getSession(path),
                callback);
        },
        goto: function(path, callback) {
            var edit = zed.getService("editor").getActiveEditor();
            zed.getService("session_manager").go(path, edit, edit.getSession(), function(err) {
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
            for (var i = 0; i < annos.length; i++) {
                var anno = annos[i];
                // ACE annotation row numbers are zero-based
                anno.row -= 1;
                // If no endColum, no inline marker is required
                if (anno.endColumn) {
                    session.annotations.push(new InlineAnnotation(session, anno));
                }
            }
            session.setAnnotations(annos);
            callback();
        },
        // Don't use setText unless you are really changing the entire contents
        // of the document, because it interacts poorly with the selection,
        // cursor position, undo history, etc.
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
        removeInLine: function(path, row, start, end, callback) {
            getSession(path).getDocument().removeInLine(row, start, end);
            callback();
        },
        removeLines: function(path, start, end, callback) {
            getSession(path).getDocument().removeLines(start, end);
            callback();
        },
        getTextRange: function(path, start, end, callback) {
            callback(null, getSession(path).getTextRange(rangify({
                start: start,
                end: end
            })));
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
        setCursorPosition: function(path, pos, callback) {
            var session = getSession(path);
            session.selection.clearSelection();
            session.selection.moveCursorToPosition(pos);
            callback();
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
            zed.getService("eventbus").emit("sessionactivitystarted", session, message);
            setTimeout(function() {
                zed.getService("eventbus").emit("sessionactivitycompleted", session);
            }, length);
            callback();
        }
    };
});
