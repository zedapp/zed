/*global define, zed*/
define(function(require, exports, module) {
    var Range = require("ace/range").Range;
    var InlineAnnotation = require("../../lib/inline_annotation");

    function rangify(range) {
        return Range.fromPoints(range.start, range.end);
    }

    function getSession(path) {
        var session = path ? zed.getService("session_manager").getSession(path) : zed.getService("editor").getActiveSession();
        if (!session) {
            console.error("Could not get session:", path);
            // TODO once we switch this to promises
        }
        return session;
    }


    function useInputable(inputableName) {
        return function(path) {
            return Promise.resolve(zed.getService("sandboxes").getInputable(getSession(path), inputableName));
        };
    }

    var identifierRegex = /[a-zA-Z_0-9\$\-]/;

    return {
        getAllLines: useInputable("lines"),
        getCursorIndex: useInputable("cursorIndex"),
        getCursorPosition: useInputable("cursor"),
        getCursorPositions: useInputable("cursors"),
        getScrollPosition: useInputable("scrollPosition"),
        getSelectionRange: useInputable("selectionRange"),
        getSelectionText: useInputable("selectionText"),
        getText: useInputable("text"),
        isInsertingSnippet: useInputable("isInsertingSnippet"),
        callCommand: function(path, command, info) {
            var session = getSession(path);
            if(info) {
                session.$cmdInfo = info;
            }
            return zed.getService("command").exec(command,  zed.getService("editor").getActiveEditor(), session);
        },
        goto: function(path) {
            var edit = zed.getService("editor").getActiveEditor();
            return zed.getService("session_manager").go(path, edit, edit.getSession()).then(function() {
                return; // Return nothing
            });
        },
        deleteSession: function(path) {
            var sessions = zed.getService("session_manager").getSessions();
            delete sessions[path];
            zed.getService("eventbus").emit("filedeleted", path);
            return Promise.resolve();
        },
        setAnnotations: function(path, annos) {
            var session = getSession(path);
            (session.annotations || []).forEach(function(anno) {
                console.log("Removing anno", anno);
                anno.remove();
            });
            session.annotations = [];
            for (var i = 0; i < annos.length; i++) {
                var anno = annos[i];
                // If no endColum, no inline marker is required
                if (anno.endColumn) {
                    session.annotations.push(new InlineAnnotation(session, anno));
                }
            }
            session.setAnnotations(annos);
            return Promise.resolve();
        },
        // Don't use setText unless you are really changing the entire contents
        // of the document, because it interacts poorly with the selection,
        // cursor position, undo history, etc.
        setText: function(path, text) {
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
            return Promise.resolve();
        },
        insertAtCursor: function(path, text) {
            var session = getSession(path);
            session.insert(session.selection.getCursor(), text);
            return Promise.resolve();
        },
        insert: function(path, pos, text) {
            var session = getSession(path);
            session.insert(pos, text);
            return Promise.resolve();
        },
        append: function(path, text) {
            var session = getSession(path);
            session.insert({
                row: session.getLength(),
                column: 0
            }, text);
            return Promise.resolve();
        },
        getPreceedingIdentifier: function(path) {
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
            return Promise.resolve(identBuf.reverse().join(""));
        },
        removeInLine: function(path, row, start, end) {
            getSession(path).getDocument().removeInLine(row, start, end);
            return Promise.resolve();
        },
        removeLines: function(path, start, end) {
            getSession(path).getDocument().removeLines(start, end);
            return Promise.resolve();
        },
        getTextRange: function(path, start, end) {
            return Promise.resolve(getSession(path).getTextRange(rangify({
                start: start,
                end: end
            })));
        },
        setCursorIndex: function(path, index) {
            var session = getSession(path);
            var text = session.getValue().slice(0, index);
            var lines = text.split("\n");
            var pos = {
                row: lines.length - 1,
                column: lines[lines.length - 1].length
            };
            session.selection.clearSelection();
            session.selection.moveCursorToPosition(pos);
            return Promise.resolve();
        },
        setCursorPosition: function(path, pos) {
            var session = getSession(path);
            session.selection.clearSelection();
            session.selection.moveCursorToPosition(pos);
            return Promise.resolve();
        },
        setScrollPosition: function(path, pos) {
            var session = getSession(path);
            session.setScrollTop(pos.scrollTop);
            session.setScrollLeft(pos.scrollLeft);
            return Promise.resolve();
        },
        replaceRange: function(path, range, text) {
            var session = getSession(path);
            var cursorPos = session.selection.getCursor();

            session.replace(rangify(range), text);

            session.selection.clearSelection();
            session.selection.moveCursorToPosition(cursorPos);
            return Promise.resolve();
        },
        getModeName: function(path) {
            return Promise.resolve(getSession(path).mode.language);
        },
        flashClearId: null,
        flashMessage: function(path, message, length) {
            if(this.flashClearId) {
                clearTimeout(this.flashClearId);
            }
            var session = getSession(path);
            zed.getService("eventbus").emit("sessionactivitystarted", session, message);
            this.flashClearId = setTimeout(function() {
                zed.getService("eventbus").emit("sessionactivitycompleted", session);
            }, length);
            return Promise.resolve();
        }
    };
});
