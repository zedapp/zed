/*global define ace $ _ */
define(function(require, exports, module) {
    "use strict";
    
    var editor = require("./editor");
    var keys = require("./keys");
    var command = require("./command");
    var string = require("./lib/string");
    var keyCode = require("./lib/key_code");
    var async = require("./lib/async");
    var settings = require("./settings");

    // TODO figure out another way to do this
    var completers = [
        require("./complete/local_word"),
        require("./complete/snippet"),
        require("./complete/ctags")
    ];
    
    var placeholderRegex = /\{((\d)+(:([^\}]*))?)\}/g;
    
    // TODO: Make these language-specific
    var identifierRegex = /[a-zA-Z_0-9\$\-]/;

    exports.addCompleter = function(completer) {
        completers.push(completer);
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

    function getCompletions(edit, callback) {
        var session = edit.getSession();
        var doc = session.getDocument();
        var pos = edit.getCursorPosition();

        var line = doc.getLine(pos.row);
        var prefix = retrievePreceedingIdentifier(line, pos.column);
        if (!prefix) {
            return false;
        }

        var matches = [];
        async.parForEach(completers, function(completer, next) {
            completer(session, pos, prefix, function(err, results) {
                if (!err) {
                    matches = matches.concat(results);
                }
                next();
            });
        }, function() {
            matches = _.uniq(matches, false, function(m) { return m.name; });
            matches.sort(function(a, b) {
                return b.score - a.score;
            });
            callback(null, {
                prefix: prefix,
                matches: matches
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
        var placeholderIndex = 0;
        
        function keyHandler(event, passOnCallback) {
            switch(event.keyCode) {
                case keyCode('Tab'):
                    placeholderIndex++;
                    if(placeholderIndex >= placeholders.length - 1) {
                        keys.resetTempRebindKeys();
                    }
                    activatePlaceholder(placeholders[placeholderIndex]);
                    event.preventDefault();
                    break;
                case keyCode('Esc'):
                case keyCode('Up'):
                case keyCode('Down'):
                case keyCode('Return'):
                    passOnCallback();
                    keys.resetTempRebindKeys();
                    break;
                default:
                    passOnCallback();
            }
        }
        
        function activatePlaceholder(placeholder) {
            edit.exitMultiSelectMode();
            placeholder.anchors.forEach(function(anchor, idx) {
                var anchorPos = anchor.getPosition();
                var r = Range.fromPoints(anchorPos, {row: anchorPos.row, column: anchorPos.column + placeholder.length});
                if(idx === 0) {
                    edit.selection.setRange(r);
                } else {
                    edit.selection.addRange(r);
                }
            });
        }
        
        while (indentCol < line.length && (line[indentCol] === " " || line[indentCol] === "\t")) {
            indent += line[indentCol];
            indentCol++;
        }
        text = text.replace(/\n/g, "\n" + indent);
        // TODO: Fix this TERRIBLE code
        text = text.replace(/\t/g, _.times(settings.get("tabSize"), function() { return " "; }).join(""));
        
        var match;
        while (match = placeholderRegex.exec(text)) {
            var id = match[2];
            if(!placeholders[id]) {
                placeholders[id] = {
                    placeholder: match[4],
                    wholeMatch: match[0]
                };
            }
        }
        edit.insert(text);
        
        function processPlaceholder(placeholder) {
            var r = Range.fromPoints(cursor, edit.getCursorPosition());
            edit.findAll(placeholder.wholeMatch, {
                start: r
            });
            var replacementText = ""; // assumption all replacement texts have same length
            placeholder.anchors = [];
            var ranges = session.selection.getAllRanges();
            if(ranges.length === 0) { // Not multiple matches
                ranges = [session.selection.getRange()];
            }
            
            // TODO: Check if still in range of snippet text
            ranges.forEach(function(r) {
                r = Range.fromPoints(r.start, r.end);
                var start = r.start;
                replacementText = placeholder.placeholder || "";
                doc.replace(r, replacementText);
                placeholder.anchors.push(doc.createAnchor(start));
            });
            placeholder.length = replacementText.length;
        }
        placeholders.forEach(processPlaceholder);
        
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

        $("body").append('<ul id="complete-box">');
        var completionEl = $("#complete-box");
        completionEl.menu({
            select: function(event, ui) {
                var text = ui.item.data("text");
                close();
                edit.focus();
                insertText(edit, text);
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
                case keyCode('Esc'):
                    close();
                    event.preventDefault();
                    return;
                case keyCode('Up'):
                    completionEl.menu("previous");
                    event.preventDefault();
                    break;
                case keyCode('Down'):
                    completionEl.menu("next");
                    event.preventDefault();
                    break;
                case keyCode('Return'):
                    if (completionEl.find("a.ui-state-focus").length > 0) {
                        completionEl.menu("select");
                        event.preventDefault();
                    } else {
                        passOnCallback();
                    }
                    break;
                case keyCode('Tab'):
                    if (event.shiftKey) {
                        completionEl.menu("previous");
                    } else {
                        completionEl.menu("next");
                    }
                    event.preventDefault();
                    break;
                default:
                    passOnCallback();
                    getCompletions(edit, function(err, result) {
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
            if (!complete()) {
                edit.indent();
            }
        }
    });
});