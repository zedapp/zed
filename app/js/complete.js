/*global define, ace, $, _ */
define(function(require, exports, module) {
    "use strict";

    var command = require("./command");
    var Autocomplete = require("ace/autocomplete").Autocomplete;

    var async = require("async");
    var config = require("./config");

    var identifierRegex = /[a-zA-Z_0-9\$\-]/;

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

    Autocomplete.prototype.commands["Tab"] = function(editor) {
        editor.completer.goTo("down");
    };
    Autocomplete.prototype.commands["Shift-Tab"] = function(editor) {
        editor.completer.goTo("up");
    };

    command.define("Edit:Complete", {
        exec: function(edit) {
            if (shouldComplete(edit)) {
                if (!edit.completer) {
                    edit.completer = new Autocomplete();
                    edit.completers = [completer];
                }
                edit.completer.showPopup(edit);
                if (edit.completer.popup) {
                    edit.completer.goTo("start");
                    edit.completer.cancelContextMenu();
                }
            } else {
                edit.indent();
            }
        }
    });
});