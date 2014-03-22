/*global define, ace, $, _ */
define(function(require, exports, module) {
    "use strict";

    var command = require("./command");
    var eventbus = require("./lib/eventbus");
    var config = require("./config");
    var editor = require("./editor");
    var Autocomplete = require("ace/autocomplete").Autocomplete;
    var async = require("async");
    var handlers = require("./handlers");

    var identifierRegex = /[a-zA-Z_0-9\$\-]/;
    var completionRegex = /^[a-zA-Z_\$]$/;

    // Continuous completion related variables
    var continuousCompletionTimerId;
    var continuousCompletionSession;
    var continuousCompletionCursor;

    exports.hook = function() {
        eventbus.on("sessionchanged", function(session, delta) {
            if (config.getPreference("continuousCompletion")) {
                var edit = editorForSession(session);
                if (!edit) {
                    return;
                }
                completionListener(edit, delta);
            }
        });
        // If the selection (cursor) changed and the session changed, cursor line changed
        // cancel completion from showing up, or hide it if it's visible
        eventbus.on("selectionchanged", function(edit) {
            if (!continuousCompletionTimerId) {
                return;
            }
            if (continuousCompletionSession !== edit.session || continuousCompletionCursor.row !== edit.getCursorPosition().row) {
                clearTimeout(continuousCompletionTimerId);
                continuousCompletionTimerId = null;
                if (edit.completer) {
                    edit.completer.detach();
                }
            }
        });
    };

    var completer = {
        getCompletions: function(edit, session, pos, prefix, callback) {
            var modeCompleteCommands = session.mode.handlers.complete;
            var globalCompleteCommands = config.getHandlers().complete;
            var results = [];
            var completeCommands = [];
            if (modeCompleteCommands) {
                completeCommands = completeCommands.concat(modeCompleteCommands);
            }
            if (globalCompleteCommands) {
                completeCommands = completeCommands.concat(globalCompleteCommands);
            }
            var startDate = Date.now();
            async.each(completeCommands, function(cmdName, next) {
                command.exec(cmdName, edit, session, function(err, results_) {
                    if (err) {
                        console.error(err);
                        return next();
                    }
                    results = results.concat(results_);
                    next();
                });
            }, function() {
                handlers.updateHandlerTimeout("complete", session.filename, startDate, config.getPreference("continuousCompletionDelay"));
                callback(null, results);
            });
        }
    };

    function retrievePreceedingIdentifier(text, pos) {
        var identBuf = [];
        for (var i = pos - 1; i >= 0; i--) {
            if (identifierRegex.test(text[i])) {
                identBuf.push(text[i]);
            } else {
                break;
            }
        }

        return identBuf.reverse().join("");
    }

    function shouldComplete(edit) {
        if (edit.getSelectedText()) {
            return false;
        }
        var session = edit.getSession();
        var doc = session.getDocument();
        var pos = edit.getCursorPosition();

        var line = doc.getLine(pos.row);
        return retrievePreceedingIdentifier(line, pos.column);
    }

    function editorForSession(session) {
        var editors = editor.getEditors();

        for (var i = 0; i < editors.length; i++) {
            if (editors[i].session === session) {
                return editors[i];
            }
        }
    }

    /**
     * Listens to change events and decides whether or not so show
     * the completion UI
     */

    function completionListener(edit, event) {
        var change = event.data;
        continuousCompletionSession = edit.session;
        continuousCompletionCursor = edit.getCursorPosition();

        if (change.action !== "insertText") {
            return cancel();
        }
        if (!completionRegex.exec(change.text)) {
            return cancel();
        }
        if (edit.session.multiSelect.inMultiSelectMode) {
            return cancel();
        }
        if (!continuousCompletionTimerId) {
            continuousCompletionTimerId = setTimeout(function() {
                continuousCompletionTimerId = null;
                if (!edit.completer || !edit.completer.activated) {
                    complete(edit, true);
                }
            }, handlers.getHandlerTimeout("check", edit.session.filename, config.getPreference("continuousCompletionDelay")));
        }

        function cancel() {
            clearTimeout(continuousCompletionTimerId);
            continuousCompletionTimerId = null;
        }
    }

    function complete(edit, continuousCompletion) {
        if (!edit.completer) {
            edit.completer = new Autocomplete();
            edit.completers = [completer];
        }
        edit.completer.autoInsert = !continuousCompletion;
        edit.completer.showPopup(edit);
        if (edit.completer.popup) {
            edit.completer.goTo("start");
            edit.completer.cancelContextMenu();
        }
    }

    Autocomplete.prototype.commands.Tab = function(editor) {
        editor.completer.goTo("down");
    };
    Autocomplete.prototype.commands["Shift-Tab"] = function(editor) {
        editor.completer.goTo("up");
    };

    command.define("Edit:Complete", {
        exec: function(edit) {
            if (shouldComplete(edit)) {
                complete(edit);
            } else {
                if (edit.inMultiSelectMode) {
                    edit.forEachSelection({
                        exec: function(edit) {
                            return edit.indent();
                        }
                    });
                } else {
                    edit.indent();
                }
            }
        }
    });
});
