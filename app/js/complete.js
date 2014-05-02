/*global define, ace, $, _ */
define(function(require, exports, module) {
    "use strict";
    plugin.provides = ["complete"];
    plugin.consumes = ["command", "eventbus", "config", "editor", "handlers"];
    return plugin;

    function plugin(options, imports, register) {
        var Autocomplete = require("./lib/autocomplete").Autocomplete;
        var async = require("async");

        var command = imports.command;
        var eventbus = imports.eventbus;
        var config = imports.config;
        var editor = imports.editor;
        var handlers = imports.handlers;

        var identifierRegex = /[a-zA-Z_0-9\$\-]/;
        var completionRegex = /^[a-zA-Z_\$]$/;

        // Continuous completion related variables
        var continuousCompletionTimerId;
        var continuousCompletionSession;
        var continuousCompletionCursor;

        eventbus.declare("complete");

        var api = {
            hook: function() {
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
                        cancelCompletion(edit);
                    }
                });
            },
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
            if(line[pos.column-1] === ".") {
                return true;
            }
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

        function cancelCompletion(edit) {
            clearTimeout(continuousCompletionTimerId);
            continuousCompletionTimerId = null;
            if (edit.completer) {
                edit.completer.detach();
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
                return cancelCompletion(edit);
            }
            if (!completionRegex.exec(change.text)) {
                return cancelCompletion(edit);
            }
            if (edit.session.multiSelect.inMultiSelectMode) {
                return cancelCompletion(edit);
            }
            if (!continuousCompletionTimerId) {
                continuousCompletionTimerId = setTimeout(function() {
                    continuousCompletionTimerId = null;
                    if (!edit.completer || !edit.completer.activated) {
                        complete(edit, true);
                    }
                }, handlers.getHandlerTimeout("check", edit.session.filename, config.getPreference("continuousCompletionDelay")));
            }
        }

        function complete(edit, continuousCompletion) {
            eventbus.emit("complete", edit);
            if (!edit.completer) {
                edit.completer = new Autocomplete();
                edit.completers = [completer];
            }
            edit.completer.autoInsert = !continuousCompletion;
            edit.completer.showPopup(edit);
            if (edit.completer.popup) {
                edit.completer.goTo("start");
                edit.completer.cancelContextMenu();
                edit.completer.goTo()
            }
        }

        Autocomplete.prototype.commands.Tab = function(editor) {
            editor.completer.goTo("down");
        };
        Autocomplete.prototype.commands["Shift-Tab"] = function(edit) {
            edit.completer.goTo("up");
        };
        Autocomplete.prototype.commands["Up"] = function(edit) {
            if (edit.completer.popup.getRow() <= 0) {
                cancelCompletion(edit);
                edit.navigateUp();
            } else {
                edit.completer.goTo("up");
            }
        };

        command.define("Edit:Complete", {
            doc: "Pop up a menu with a list of possible completions for the current word if preceeding the cursor is an identifier, otherwise indent.",
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

        register(null, {
            complete: api
        });
    }

});
