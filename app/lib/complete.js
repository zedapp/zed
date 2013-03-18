define(function(require, exports, module) {
    "use strict";
    var editor = require("./editor");
    var keys = require("./keys");
    var command = require("./command");
    var string = require("./string");

    var completers = [require("./complete/local_word"), require("./complete/snippet")];
    var identifierRegex = /[a-zA-Z_0-9\$\-]/;
    var placeholderRegex = /\{((\d)+(:([^\}]*))?)\}/g;

    exports.addCompleter = function(completer) {
        completers.push(completer);
    };

    function retrievePreceedingIdentifier(text, pos) {
        var buf = [];
        for (var i = pos - 1; i >= 0; i--) {
            if (identifierRegex.test(text[i])) buf.push(text[i]);
            else break;
        }
        return buf.reverse().join("");
    }

    function getCompletions(edit, callback) {
        var session = edit.getSession();
        var doc = session.getDocument();
        var text = session.getValue();
        var pos = edit.getCursorPosition();

        var line = doc.getLine(pos.row);
        var prefix = retrievePreceedingIdentifier(line, pos.column);
        if (!prefix) return false;

        var matches = [];
        var waiting = completers.length;

        function done() {
            matches.sort(function(a, b) {
                return b.score - a.score;
            });
            callback(null, {
                prefix: prefix,
                matches: matches
            });
        }
        completers.forEach(function(completer) {
            completer(session, pos, prefix, function(err, results) {
                if (!err) {
                    matches = matches.concat(results);
                }
                waiting--;
                if (waiting === 0) done();
            });
        });
        return true;
    }

    function complete() {
        var edit = editor.getActiveEditor();
        return getCompletions(edit, function(err, result) {
            if (result.matches.length === 1) {
                insertText(edit, result.matches[0].text);
            } else if (result.matches.length > 0) {
                renderCompletionBox(result.matches, result.prefix, edit);
            }
        });
    }

    function insertText(edit, text) {
        var Range = ace.require("ace/range").Range;
        edit.removeWordLeft();
        var cursor = edit.getCursorPosition();
        var session = edit.getSession();
        var doc = session.getDocument();
        var line = edit.getSession().getLine(cursor.row);
        var indentCol = 0;
        var indent = '';
        
        // Placeholder management
        var placeholders = [];
        window.placeholders = placeholders;
        var placeholderIndex = 0;
        
        function keyHandler(event, passOnCallback) {
            var args = arguments;
            switch(event.keyCode) {
                case 9: // tab
                    placeholderIndex++;
                    if(placeholderIndex >= placeholders.length - 1) {
                        keys.resetTempRebindKeys();
                    }
                    activatePlaceholder(placeholders[placeholderIndex]);
                    event.preventDefault();
                    break;
                case 27: // Esc
                case 38: // Up
                case 40: // Down
                case 13: // enter
                    passOnCallback();
                    keys.resetTempRebindKeys();
                    break;
                default:
                    passOnCallback();
            }
        }
        
        function activatePlaceholder(placeholder) {
            edit.exitMultiSelectMode();
            var anchorPos = placeholder.anchor.getPosition();
            edit.selection.setRange(Range.fromPoints(anchorPos, {row: anchorPos.row, column: anchorPos.column + placeholder.length}));
            if(placeholder.extraCursors) {
                placeholder.extraCursors.forEach(function(placeholder) {
                    var anchorPos = placeholder.anchor.getPosition();
                    session.selection.addRange(Range.fromPoints(anchorPos, {row: anchorPos.row, column: anchorPos.column + placeholder.length}));
                });
            }
        }
        
        while (indentCol < line.length && (line[indentCol] === " " || line[indentCol] === "\t")) {
            indent += line[indentCol];
            indentCol++;
        }
        text = text.replace(/\n/g, "\n" + indent);
        var match;
        while (match = placeholderRegex.exec(text)) {
            var id = match[2];
            if(placeholders[id]) {
                // Already another one there!
                var placeholder = placeholders[id];
                placeholder.extraCursors = placeholders.extraCursors || [];
                placeholder.extraCursors.push({
                    placeholder: match[4],
                    wholeMatch: match[0]
                });
            } else {
                placeholders[id] = {
                    placeholder: match[4],
                    wholeMatch: match[0]
                };
            }
        }
        edit.insert(text);
        
        function processPlaceholder(placeholder) {
            var r = Range.fromPoints(cursor, edit.getCursorPosition());
            edit.find(placeholder.wholeMatch, {
                start: r
            });
            var start = edit.selection.getRange().start;
            var replacementText = placeholder.placeholder || "";
            session.replace(edit.selection.getRange(), replacementText);
            placeholder.anchor = doc.createAnchor(start);
            placeholder.length = replacementText.length;
        }
        placeholders.forEach(function(placeholder) {
            processPlaceholder(placeholder);
            if(placeholder.extraCursors) {
                placeholder.extraCursors.forEach(processPlaceholder);
            }
        });
        
        if(placeholders.length > 0) {
            activatePlaceholder(placeholders[0]);
            if(placeholders.length > 1) {
                keys.tempRebindKeys(keyHandler);
            }
        }
    }

    function renderCompletionBox(matches, prefix, edit) {
        var cursorLayer = edit.renderer.$cursorLayer;
        var cursorConfig = cursorLayer.config;
        var oldOnCommandKey;
        var oldOnTextInput;

        $("body").append('<ul id="complete-box">');
        var completionEl = $("#complete-box");
        completionEl.menu({
            select: function(event, ui) {
                var text = ui.item.data("text");
                close();
                edit.focus();
                insertText(edit, text)
                event.preventDefault();
            }
        });
        updatePosition();
        updateCompletion();
        completionEl.hide();

        function updatePosition() {
            // Need a timeout, to give ACE some time to move the cursor
            setTimeout(function() {
                completionEl.show();
                var cursorPosition = $(cursorLayer.cursor).offset();
                completionEl.css("left", (cursorPosition.left - cursorConfig.characterWidth * prefix.length - 4) + "px");
                completionEl.css("top", (cursorPosition.top + cursorConfig.lineHeight) + "px");
            }, 100);
        }

        function updateCompletion() {
            completionEl.html(renderOptionsHtml(matches));
            completionEl.menu("refresh");
            completionEl.menu("next");
        }

        function close() {
            completionEl.remove();
            $("body").unbind("click", close);
            edit.container.removeEventListener("DOMMouseScroll", close);
            edit.container.removeEventListener("mousewheel", close);
            keys.resetTempRebindKeys();
        }

        function renderOptionsHtml(matches) {
            var html = '';
            matches.forEach(function(match) {
                var matchHtml = "<span class='match'>" + match.name.substring(0, prefix.length) + "</span>" + match.name.substring(prefix.length);
                html += '<li data-text="' + string.htmlEscape(match.text) + '"><a href="#">' + matchHtml + '</a><span class="meta">' + (match.meta || "") + '</span></li>';
            });
            return html;
        }

        function keyHandler(event, passOnCallback) {
            switch (event.keyCode) {
                case 27:
                    // esc
                    close();
                    event.preventDefault();
                    return;
                case 38:
                    // up
                    completionEl.menu("previous");
                    event.preventDefault();
                    break;
                case 40:
                    // down
                    completionEl.menu("next");
                    event.preventDefault();
                    break;
                case 13:
                    // enter
                    if (completionEl.find("a.ui-state-focus").length > 0) {
                        completionEl.menu("select");
                        event.preventDefault();
                    } else {
                        passOnCallback();
                    }
                    break;
                case 9:
                    // tab
                    if (event.shiftKey) completionEl.menu("previous");
                    else completionEl.menu("next");
                    event.preventDefault();
                    break;
                default:
                    passOnCallback();
                    var result = getCompletions(edit, function(err, result) {
                        matches = result.matches;
                        prefix = result.prefix;
                        if (!matches || matches.length === 0) {
                            close();
                        } else {
                            updatePosition();
                            updateCompletion();
                        }
                    });
            }
        }

        keys.tempRebindKeys(keyHandler);

        // Subscribe to events that should make the completion box close
        $("body").bind("click", close);
        edit.container.addEventListener("DOMMouseScroll", close);
        edit.container.addEventListener("mousewheel", close);
    }

    command.define("Edit:Complete", {
        exec: function(edit) {
            if (!complete()) edit.indent();
        }
    });
});