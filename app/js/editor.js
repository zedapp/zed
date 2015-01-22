define(function(require, exports, module) {
    "use strict";

    plugin.consumes = ["eventbus", "command", "config", "modes", "sandboxes"];
    plugin.provides = ["editor"];
    return plugin;

    function plugin(options, imports, register) {
        var whitespace = require("ace/ext/whitespace");
        var font = require("./lib/font");

        var eventbus = imports.eventbus;
        var command = imports.command;
        var config = imports.config;
        var modes = imports.modes;
        var sandboxes = imports.sandboxes;

        var IDENT_REGEX = /[a-zA-Z0-9_$\-]+/;
        var PATH_REGEX = /[\/\.a-zA-Z0-9_$\-:]/;

        eventbus.declare("editorloaded");
        eventbus.declare("selectionchanged");
        eventbus.declare("sessionclicked"); // edit, session, event

        var editors = [];
        var activeEditor = null;

        var api = {
            hook: function() {
                eventbus.on("configchanged", function() {
                    setTimeout(api.updateConfiguration);
                });

                eventbus.on("switchsession", function(edit, session) {
                    api.setEditorConfiguration(edit);
                    api.setSessionConfiguration(session);
                });

                eventbus.on("filedeleted", function(path) {
                    editors.forEach(function(edit) {
                        if (edit.getSession().filename === path) {
                            zed.getService("session_manager").go("zed::start", edit);
                        }
                    });
                });

                $("body").append('<div id="editor-wrapper-wrapper"><div id="editor-wrapper"></div></div>');
            },
            setEditorConfiguration: function(edit) {
                var session = edit.getSession();
                edit.setHighlightActiveLine(config.getPreference("highlightActiveLine", session));
                edit.setHighlightGutterLine(config.getPreference("highlightGutterLine", session));
                edit.setFontSize(config.getPreference("fontSize", session));
                edit.setShowPrintMargin(config.getPreference("showPrintMargin", session));
                edit.setPrintMarginColumn(config.getPreference("printMarginColumn", session));
                edit.setShowInvisibles(config.getPreference("showInvisibles", session));
                edit.setDisplayIndentGuides(config.getPreference("displayIndentGuides", session));
                edit.setOption("scrollPastEnd", config.getPreference("scrollPastEnd", session));
                edit.setAnimatedScroll(config.getPreference("animatedScroll", session));
                edit.setShowFoldWidgets(config.getPreference("showFoldWidgets", session));
                edit.setScrollSpeed(config.getPreference("scrollSpeed", session));
                edit.renderer.setShowGutter(config.getPreference("showGutter", session));
                edit.setHighlightSelectedWord(config.getPreference("highlightSelectedWord", session));
                edit.setBehavioursEnabled(config.getPreference("behaviorsEnabled", session)); // ( -> ()
                edit.setWrapBehavioursEnabled(config.getPreference("wrapBehaviorsEnabled", session)); // same as above but with selection
                var fontFamily = config.getPreference("fontFamily");
                if (font.isInstalled(fontFamily)) {
                    $(edit.container).css("font-family", config.getPreference("fontFamily"));
                } else {
                    eventbus.emit("sessionactivityfailed", session, "Invalid font: " + fontFamily);
                }

                if (config.getPreference("autoIndentOnPaste", session)) {
                    edit.on("paste", function(e) {
                        autoIndentOnPaste(edit, session, e);
                    });
                } else {
                    edit.removeAllListeners("paste");
                }
                edit.setKeyboardHandler({
                    vim: "ace/keyboard/vim",
                    emacs: "ace/keyboard/emacs",
                    zed: null
                }[config.getPreference("keybinding", session)]);
            },
            setSessionConfiguration: function(session) {
                session.setTabSize(config.getPreference("tabSize", session));
                session.setUseSoftTabs(config.getPreference("useSoftTabs", session));
                session.setUseWrapMode(config.getPreference("wordWrap", session));
                session.setWrapLimitRange(null, config.getPreference("wordWrapColumn", session));
            },
            updateConfiguration: function() {
                api.getEditors(true).forEach(function(edit) {
                    api.setEditorConfiguration(edit);
                });
                var session_manager = zed.getService("session_manager");
                var sessions = _.values(session_manager.getSessions()).concat(_.values(session_manager.specialDocs));
                _.each(sessions, function(session) {
                    api.setSessionConfiguration(session);
                });
            },
            // Automatically called after all plugins are instantiated
            init: function() {
                $("#editor-wrapper").append("<div id='editor0' class='editor-single'>");
                $("#editor-wrapper").append("<div id='editor1' class='editor-disabled'>");
                $("#editor-wrapper").append("<div id='editor2' class='editor-disabled'>");

                ace.config.setDefaultValue("editor", "enableBasicAutocompletion", true);

                editors.push(ace.edit("editor0"));
                editors.push(ace.edit("editor1"));
                editors.push(ace.edit("editor2"));

                editors.forEach(function(editor) {
                    editor.$blockScrolling = Infinity;
                    editor.setShowPrintMargin(false);
                    // Disable ACE's built-in theming
                    editor.setTheme({
                        cssClass: "_",
                        cssText: " "
                    });
                    editor.on("focus", function() {
                        activeEditor = editor;
                        editor.renderer.$cursorLayer.setSmoothBlinking(true);
                        eventbus.emit("splitswitched", editor);
                    });
                    editor.on("blur", function() {
                        zed.getService("session_manager").saveSession(editor.getSession());
                    });
                    editor.on("changeSelection", function() {
                        eventbus.emit("selectionchanged", editor);
                    });
                    editor.on("click", function(e) {
                        eventbus.emit("sessionclicked", editor, editor.session, e);
                    });
                });
                api.setActiveEditor(editors[0]);
                // return;
                eventbus.emit("editorloaded", api);
            },
            createSession: function(path, content) {
                var session = ace.createEditSession(content);
                session.filename = path;
                var mode = modes.getModeForSession(session);
                session.setUseWrapMode(config.getPreference("wordWrap"));
                session.setTabSize(config.getPreference("tabSize"));
                session.setUseSoftTabs(config.getPreference("useSoftTabs"));
                session.setUseWorker(false);
                modes.setSessionMode(session, mode);
                if (config.getPreference("detectIndentation")) {
                    whitespace.detectIndentation(session);
                }
                return session;
            },
            switchSession: function(session, edit) {
                edit = edit || api.getActiveEditor();
                var prevSession = edit.session;
                edit.setSession(session);
                edit.setReadOnly( !! session.readOnly);
                eventbus.emit("switchsession", edit, session, prevSession);
            },
            isInsertingSnippet: function() {
                return !!activeEditor.tabstopManager;
            },
            getActiveEditor: function() {
                return activeEditor;
            },
            setActiveEditor: function(editor) {
                activeEditor = editor;
                if(!zed.services.fs.isEmpty) {
                    activeEditor.focus();
                }
            },
            getEditors: function(all) {
                if (all) {
                    return editors;
                }

                return editors.filter(function(edit) {
                    return $(edit.container).is(':visible');
                });
            },
            resizeEditors: function() {
                api.getEditors().forEach(function(edit) {
                    edit.resize();
                });
            },
            getActiveSession: function() {
                return api.getActiveEditor().getSession();
            },
            getSessionState: function(session) {
                var undoStack = session.getUndoManager().$undoStack.slice(-25);
                var redoStack = session.getUndoManager().$redoStack.slice(-25);
                return {
                    scrollTop: session.getScrollTop(),
                    scrollLeft: session.getScrollLeft(),
                    selection: session.getSelection().getRange(),
                    lastUse: session.lastUse,
                    undo: undoStack,
                    redo: redoStack
                };
            },
            setSessionState: function(session, state) {
                var Range = require("ace/range").Range;

                // Turns JSONified Range objects back into real Ranges
                function rangify(ar) {
                    ar.forEach(function(undoArray) {
                        undoArray.forEach(function(undo) {
                            undo.deltas.forEach(function(delta) {
                                delta.range = Range.fromPoints(delta.range.start, delta.range.end);
                            });
                        });
                    });
                }
                session.getSelection().setSelectionRange(state.selection, false);
                session.setScrollTop(state.scrollTop);
                session.setScrollLeft(state.scrollLeft);
                session.lastUse = state.lastUse;

                var undoManager = session.getUndoManager();
                rangify(state.undo);
                rangify(state.redo);

                undoManager.$doc = session;
                undoManager.$undoStack = state.undo || [];
                undoManager.$redoStack = state.redo || [];
            },
            getIdentifierUnderCursor: function(edit, regex) {
                regex = regex || IDENT_REGEX;
                edit = edit || api.getActiveEditor();
                return edit.getSession().getTextRange(api.getIdentifierUnderCursorRange(edit, regex));
            },
            getIdentifierUnderCursorRange: function(edit, regex) {
                regex = regex || IDENT_REGEX;
                edit = edit || api.getActiveEditor();
                var Range = require("ace/range").Range;
                var session = edit.getSession();
                var cursor = edit.getCursorPosition();
                var line = session.getLine(cursor.row);

                // If cursor is not on an identifier at all, return empty string
                if (!regex.test(line[cursor.column])) {
                    return "";
                }

                for (var startCol = cursor.column; startCol >= 0; startCol--) {
                    if (!regex.test(line[startCol])) {
                        startCol++;
                        break;
                    }
                }
                for (var endCol = cursor.column; endCol < line.length; endCol++) {
                    if (!regex.test(line[endCol])) {
                        break;
                    }
                }
                return new Range(cursor.row, startCol, cursor.row, endCol);
            },
            getPathUnderCursor: function(edit) {
                return api.getIdentifierUnderCursor(edit, PATH_REGEX);
            }
        };

        function autoIndentOnPaste(editor, session, e) {
            var pos = editor.getSelectionRange().start;
            var line = editor.getSession().getLine(pos.row);
            var tabSize = config.getPreference("tabSize", session);
            var col = pos.column;
            for (var i = 0; i < pos.column; i++) {
                if (line[i] === "\t") {
                    col += (tabSize - 1);
                }
            }
            var tabAsSpaces = "";
            for (i = 0; i < tabSize; i++) {
                tabAsSpaces += " ";
            }
            var text = e.text.replace(/\t/gm, tabAsSpaces);
            var lines = text.split("\n");
            var regexp = /\S/;
            var min = -1;
            var index;
            for (i = 1; i < lines.length; i++) {
                index = lines[i].search(regexp);
                if (index !== -1 && (index < min || min === -1)) {
                    min = index;
                }
            }
            var adjust = col - min;
            if (min > -1 && adjust !== 0) {
                if (adjust < 0) {
                    for (i = 1; i < lines.length; i++) {
                        lines[i] = lines[i].substring(-adjust);
                    }
                } else if (adjust > 0) {
                    var add = "";
                    for (i = 0; i < adjust; i++) {
                        add += " ";
                    }

                    for (i = 1; i < lines.length; i++) {
                        lines[i] = add + lines[i];
                    }
                }
            }

            lines[0] = lines[0].substring(lines[0].search(regexp));
            e.text = lines.join("\n");
            if (!config.getPreference("useSoftTabs", session)) {
                regexp = new RegExp(tabAsSpaces, "gm");
                e.text = e.text.replace(regexp, "\t");
            }
        }

        function find(session, needle, dir) {
            var Search = require("ace/search").Search;
            var search = new Search();
            search.$options.wrap = true;
            search.$options.needle = needle;
            search.$options.caseSensitive = true;
            search.$options.wholeWord = true;
            search.$options.backwards = dir == -1;
            return search.find(session);
        }

        function selectMore(edit, dir) {
            var session = edit.getSession();
            var sel = session.multiSelect;

            var range = sel.toOrientedRange();
            var needle = session.getTextRange(range);

            var newRange = find(session, needle, dir);
            if (newRange) {
                newRange.cursor = dir == -1 ? newRange.start : newRange.end;
                edit.multiSelect.addRange(newRange);
            }
        }

        command.define("Navigate:Line", {
            doc: "Prompts for a specific line to jump to within the file.",
            exec: function(edit, session) {
                return command.exec("Navigate:Goto", edit, session, ":");
            },
            readOnly: true
        });

        command.define("Navigate:Path Under Cursor", {
            doc: "Open the file indicated by the cursor.",
            exec: function(edit, session) {
                var path = api.getPathUnderCursor();
                return command.exec("Navigate:Goto", edit, session, path);
            }
        });

        // FOLD
        command.define("Fold:Fold", {
            doc: "Hide the code block currently enclosing the cursor.",
            exec: function(editor) {
                editor.session.toggleFold(false);
            },
            readOnly: true
        });

        command.define("Fold:Unfold", {
            doc: "Show a hidden code block.",
            exec: function(editor) {
                editor.session.toggleFold(true);
            },
            readOnly: true
        });

        command.define("Fold:Fold All", {
            doc: "Hide all possible code blocks for the current mode.",
            exec: function(editor) {
                editor.session.foldAll();
            },
            readOnly: true
        });

        command.define("Fold:Unfold All", {
            doc: "Show all hidden code blocks.",
            exec: function(editor) {
                editor.session.unfold();
            },
            readOnly: true
        });


        // SELECT
        command.define("Select:Up", {
            doc: "Move the cursor up one line, altering the selection.",
            exec: function(editor) {
                editor.getSelection().selectUp();
            },
            multiSelectAction: "forEach",
            readOnly: true
        });

        command.define("Select:All", {
            doc: "Select entire document.",
            exec: function(editor) {
                editor.selectAll();
            },
            readOnly: true,
            scrollIntoView: false
        });

        command.define("Select:None", {
            doc: "Select entire document.",
            exec: function(editor) {
                editor.clearSelection();
            },
            readOnly: true,
            scrollIntoView: false
        });

        command.define("Select:To File End", {
            doc: "Select from the cursor to the end of the file.",
            exec: function(editor) {
                editor.getSelection().selectFileEnd();
            },
            multiSelectAction: "forEach",
            readOnly: true
        });

        command.define("Select:Down", {
            doc: "Move the cursor down one line, altering the selection.",
            exec: function(editor) {
                editor.getSelection().selectDown();
            },
            multiSelectAction: "forEach",
            readOnly: true
        });

        command.define("Select:Word Left", {
            doc: "Move the cursor one word left, altering the selection.",
            exec: function(editor) {
                editor.getSelection().selectWordLeft();
            },
            multiSelectAction: "forEach",
            readOnly: true
        });

        command.define("Select:To Line Start", {
            doc: "Select from the cursor to the beginning of the current line.",
            exec: function(editor) {
                editor.getSelection().selectLineStart();
            },
            multiSelectAction: "forEach",
            readOnly: true
        });

        command.define("Select:Left", {
            doc: "Move the cursor one character left, altering the selection.",
            exec: function(editor) {
                editor.getSelection().selectLeft();
            },
            multiSelectAction: "forEach",
            readOnly: true
        });

        command.define("Select:Word Right", {
            doc: "Move the cursor one word right, altering the selection.",
            exec: function(editor) {
                editor.getSelection().selectWordRight();
            },
            multiSelectAction: "forEach",
            readOnly: true
        });

        command.define("Select:To Line End", {
            doc: "Select from the cursor to the end of the current line.",
            exec: function(editor) {
                editor.getSelection().selectLineEnd();
            },
            multiSelectAction: "forEach",
            readOnly: true
        });

        command.define("Select:Right", {
            doc: "Move the cursor one character right, altering the selection.",
            exec: function(editor) {
                editor.getSelection().selectRight();
            },
            multiSelectAction: "forEach",
            readOnly: true
        });

        command.define("Select:Page Down", {
            doc: "Move the cursor one page down, altering the selection.",
            exec: function(editor) {
                editor.selectPageDown();
            },
            readOnly: true
        });

        command.define("Select:To Matching Brace", {
            doc: "Select a code block denoted by matching braces.",
            exec: function(editor) {
                editor.jumpToMatching(true);
            },
            multiSelectAction: "forEach",
            readOnly: true
        });

        command.define("Select:Page Up", {
            doc: "Move the cursor one page up, altering the selection.",
            exec: function(editor) {
                editor.selectPageUp();
            },
            readOnly: true
        });

        command.define("Select:To File Start", {
            doc: "Select from the mouse cursor to the beginning of the document.",
            exec: function(editor) {
                editor.getSelection().selectFileStart();
            },
            readOnly: true
        });

        command.define("Select:Duplicate", {
            doc: "Duplicate the currently selected text.",
            exec: function(editor) {
                editor.duplicateSelection();
            },
            multiSelectAction: "forEach"
        });


        // CURSOR
        command.define("Cursor:Up", {
            doc: "Move the cursor up one line.",
            exec: function(editor, session, args) {
                editor.navigateUp(args && args.times);
            },
            multiSelectAction: "forEach",
            readOnly: true
        });

        command.define("Cursor:Down", {
            doc: "Move the cursor down one line.",
            exec: function(editor, session, args) {
                editor.navigateDown(args && args.times);
            },
            multiSelectAction: "forEach",
            readOnly: true
        });

        command.define("Cursor:File Start", {
            doc: "Move the cursor to the beginning of the document.",
            exec: function(editor) {
                editor.navigateFileStart();
            },
            multiSelectAction: "forEach",
            readOnly: true,
            scrollIntoView: "animate"
        });

        command.define("Cursor:File End", {
            doc: "Move the cursor to the end of the document.",
            exec: function(editor) {
                editor.navigateFileEnd();
            },
            multiSelectAction: "forEach",
            readOnly: true,
            scrollIntoView: "animate"
        });

        command.define("Cursor:Word Left", {
            doc: "Move the cursor one word to the left.",
            exec: function(editor) {
                editor.navigateWordLeft();
            },
            multiSelectAction: "forEach",
            readOnly: true
        });

        command.define("Cursor:Word Right", {
            doc: "Move the cursor one word to the right.",
            exec: function(editor) {
                editor.navigateWordRight();
            },
            multiSelectAction: "forEach",
            readOnly: true
        });

        command.define("Cursor:Line Start", {
            doc: "Move the cursor to the beginning of the current line.",
            exec: function(editor) {
                editor.navigateLineStart();
            },
            multiSelectAction: "forEach",
            readOnly: true
        });

        command.define("Cursor:Left", {
            doc: "Move the cursor one character to the left.",
            exec: function(editor, session, args) {
                editor.navigateLeft(args && args.times);
            },
            multiSelectAction: "forEach",
            readOnly: true
        });

        command.define("Cursor:Line End", {
            doc: "Move the cursor to the end of the line.",
            exec: function(editor) {
                editor.navigateLineEnd();
            },
            multiSelectAction: "forEach",
            readOnly: true
        });

        command.define("Cursor:Right", {
            doc: "Move the cursor one character to the right.",
            exec: function(editor, session, args) {
                editor.navigateRight(args && args.times);
            },
            multiSelectAction: "forEach",
            readOnly: true
        });

        command.define("Cursor:Page Down", {
            doc: "Move the cursor one page down.",
            exec: function(editor) {
                editor.gotoPageDown();
            },
            readOnly: true
        });

        command.define("Cursor:Page Up", {
            doc: "Move the cursor one page up.",
            exec: function(editor) {
                editor.gotoPageUp();
            },
            readOnly: true
        });

        command.define("Cursor:To Matching Brace", {
            doc: "Move the cursor to the matching brace character, if present.",
            exec: function(editor) {
                editor.jumpToMatching();
            },
            multiSelectAction: "forEach",
            readOnly: true
        });

        command.define("Cursor:Center", {
            doc: "Scroll the document such that the cursor is in the vertical center of the screen.",
            exec: function(editor) {
                editor.centerSelection();
            },
            readOnly: true
        });

        // Cursor: Multiple
        command.define("Cursor:Multiple:Add At Next Instance Of Identifier", {
            doc: "Add an additional cursor where the current word next appears in the current file.",
            exec: function(edit) {
                if (edit.selection.isEmpty()) {
                    var range = api.getIdentifierUnderCursorRange();
                    edit.selection.setSelectionRange(range);
                }
                selectMore(edit, 1);
            }
        });

        command.define("Cursor:Multiple:Add At Previous Instance Of Identifier", {
            doc: "Add an additional cursor where the current word previously appears in the current file.",
            exec: function(edit) {
                if (edit.selection.isEmpty()) {
                    var range = api.getIdentifierUnderCursorRange();
                    edit.selection.setSelectionRange(range);
                }
                selectMore(edit, -1);
            }
        });

        command.define("Cursor:Multiple:Add Above", {
            doc: "Add an additional cursor one row above the current cursor.",
            exec: function(editor) {
                editor.selectMoreLines(-1);
            },
        });

        command.define("Cursor:Multiple:Add Below", {
            doc: "Add an additional cursor one row below the current cursor.",
            exec: function(editor) {
                editor.selectMoreLines(1);
            },
        });

        command.define("Cursor:Multiple:Add Above Skip Current", {
            doc: "Move the most recently created multiple curson up by one row.",
            exec: function(editor) {
                editor.selectMoreLines(-1, true);
            },
        });

        command.define("Cursor:Multiple:Add Below Skip Current", {
            doc: "Move the most recently created multiple curson down by one row.",
            exec: function(editor) {
                editor.selectMoreLines(1, true);
            },
        });

        command.define("Cursor:Multiple:Align cursors", {
            doc: "Align all cursors and text to the same vertical position",
            exec: function(editor) {
                editor.alignCursors();
            },
        });

        // SCROLL

        command.define("Scroll:Page Down", {
            doc: "Scroll the document one page down without moving the cursor position.",
            exec: function(editor) {
                editor.scrollPageDown();
            },
            readOnly: true
        });
        command.define("Scroll:Page Up", {
            doc: "Scroll the document one page up witout moving the cursor position.",
            exec: function(editor) {
                editor.scrollPageUp();
            },
            readOnly: true
        });

        command.define("Scroll:Down", {
            doc: "Scroll the document down without moving the cursor position.",
            exec: function(e) {
                e.renderer.scrollBy(0, 2 * e.renderer.layerConfig.lineHeight);
            },
            readOnly: true
        });

        command.define("Scroll:Up", {
            doc: "Scroll the document up without moving the cursor position.",
            exec: function(e) {
                e.renderer.scrollBy(0, -2 * e.renderer.layerConfig.lineHeight);
            },
            readOnly: true
        });

        // MACRO
        command.define("Macro:Toggle Recording", {
            doc: "Begin recording a macro, or halt recording if it has already begun.",
            exec: function(editor) {
                editor.commands.toggleRecording(editor);
            },
            readOnly: true
        });

        command.define("Macro:Replay", {
            doc: "Repeat the last-recorded macro.",
            exec: function(editor) {
                editor.commands.replay(editor);
            },
            readOnly: true
        });

        // EDIT
        command.define("Edit:Remove Line", {
            doc: "Delete the current line.",
            exec: function(editor) {
                editor.removeLines();
            },
            multiSelectAction: "forEach"
        });

        command.define("Edit:Toggle Comment", {
            doc: "Comment the current line.",
            exec: function(editor) {
                editor.toggleCommentLines();
            },
            multiSelectAction: "forEach",
            scrollIntoView: "selectionPart"
        });

        command.define("Edit:Number:Increase", {
            doc: "Add 1 to the number under the cursor.",
            exec: function(editor) {
                editor.modifyNumber(1);
            },
            multiSelectAction: "forEach"
        });

        command.define("Edit:Number:Decrease", {
            doc: "Subtract 1 from the number under the cursor.",
            exec: function(editor) {
                editor.modifyNumber(-1);
            },
            multiSelectAction: "forEach"
        });

        command.define("Edit:Undo", {
            doc: "Revert the previous change.",
            exec: function(editor) {
                editor.undo();
            }
        });

        command.define("Edit:Redo", {
            doc: "Redo the previous undo.",
            exec: function(editor) {
                editor.redo();
            }
        });

        command.define("Edit:Copy Lines Up", {
            doc: "Copy the currently selected lines above the current selection. " + "The current line is used if there is no selection.",
            exec: function(editor) {
                editor.copyLinesUp();
            },
            multiSelectAction: "forEach"
        });
        command.define("Edit:Move Lines Up", {
            doc: "Move the currently selected lines up one line. " + "The current line is used if there is no selection.",
            exec: function(editor) {
                editor.moveLinesUp();
            },
            multiSelectAction: "forEach"
        });
        command.define("Edit:Copy Lines Down", {
            doc: "Copy the currently selected lines below the current selection. " + "The current line is used if there is no selection.",
            exec: function(editor) {
                editor.copyLinesDown();
            },
            multiSelectAction: "forEach"
        });
        command.define("Edit:Move Lines Down", {
            doc: "Move the currently selected lines down one line. " + "The current line is used if there is no selection.",
            exec: function(editor) {
                editor.moveLinesDown();
            },
            multiSelectAction: "forEach"
        });
        command.define("Edit:Delete", {
            doc: "Deletes one character to the right.",
            exec: function(editor) {
                editor.remove("right");
            },
            multiSelectAction: "forEach"
        });
        command.define("Edit:Backspace", {
            doc: "Deletes one character to the left.",
            exec: function(editor) {
                editor.remove("left");
            },
            multiSelectAction: "forEach"
        });

        command.define("Edit:Remove To Line Start", {
            doc: "Deletes everything from the cursor to the start of the line.",
            exec: function(editor) {
                editor.removeToLineStart();
            },
            multiSelectAction: "forEach"
        });

        command.define("Edit:Remove To Line End", {
            doc: "Deletes everything from the cursor to the end of the line.",
            exec: function(editor) {
                editor.removeToLineEnd();
            },
            multiSelectAction: "forEach"
        });

        command.define("Edit:Outdent", {
            doc: "Decrease the indentation of the current line.",
            exec: function(editor) {
                editor.blockOutdent();
            },
            multiSelectAction: "forEach"
        });

        command.define("Edit:Indent", {
            doc: "Insert a tab at the cursor position.",
            exec: function(editor) {
                editor.indent();
            },
            multiSelectAction: "forEach",
        });

        command.define("Edit:Block Outdent", {
            doc: "Decrease the indent of the selected block.",
            exec: function(editor) {
                editor.blockOutdent();
            },
            multiSelectAction: "forEach",
            scrollIntoView: "selectionPart"
        });

        command.define("Edit:Block Indent", {
            doc: "Increase the indent of the selected block.",
            exec: function(editor) {
                editor.blockIndent();
            },
            multiSelectAction: "forEach",
            scrollIntoView: "selectionPart"
        });

        command.define("Edit:Split Line", {
            doc: "Splits the current line into two lines.",
            exec: function(editor) {
                editor.splitLine();
            },
            multiSelectAction: "forEach"
        });

        command.define("Edit:Transpose Letters", {
            doc: "Swaps the character before the cursor with the character after " + "the cursor. Multiple invocations will have the effect of moving the " + "character before the cursor forward through the file.",
            exec: function(editor) {
                editor.transposeLetters();
            },
            multiSelectAction: function(editor) {
                editor.transposeSelections(1);
            }
        });

        command.define("Edit:Uppercase", {
            doc: "Change the selected text into uppercase.",
            exec: function(editor) {
                editor.toUpperCase();
            },
            multiSelectAction: "forEach"
        });

        command.define("Edit:Lowercase", {
            doc: "Change the selected text into lowercase.",
            exec: function(editor) {
                editor.toLowerCase();
            },
            multiSelectAction: "forEach"
        });

        command.define("Edit:Remove Word Left", {
            doc: "Delete one word to the left.",
            exec: function(editor) {
                editor.removeWordLeft();
            },
            multiSelectAction: "forEach"
        });

        command.define("Edit:Remove Word Right", {
            doc: "Delete one word to the right.",
            exec: function(editor) {
                editor.removeWordRight();
            },
            multiSelectAction: "forEach"
        });

        command.define("Edit:Overwrite Mode", {
            doc: "Toggle overwrite mode, which causes each character typed to " + "replace the one at right of the cursor instead of being inserted before it.",
            exec: function(editor) {
                editor.toggleOverwrite();
            }
        });

        command.define("Edit:Detect Indentation", {
            doc: "",
            exec: function(edit) {
                whitespace.detectIndentation(edit.session);
            }
        });

        command.define("Edit:Convert Indentation", {
            doc: "",
            exec: function(edit) {
                // todo this command needs a way to get values for tabChar and tabLength
                whitespace.convertIndentation(edit.session);
            }
        });

        // FIND
        command.define("Find:Find", {
            doc: "Prompt for a case-sensitive search within the current file.",
            exec: function(edit, session) {
                command.exec("Navigate:Goto", edit, session, ":/");
            },
            readOnly: true
        });

        command.define("Find:Find Case Insensitive", {
            doc: "Prompt for a case-insensitive search within the current file.",
            exec: function(edit, session) {
                command.exec("Navigate:Goto", edit, session, ":|");
            },
            readOnly: true
        });

        command.define("Find:Next", {
            doc: "Jump to the next instance of the search term.",
            exec: function(editor) {
                editor.findNext({
                    wholeWord: false
                });
            },
            readOnly: true
        });

        command.define("Find:Previous", {
            doc: "Jump to the previous instance of the search term.",
            exec: function(editor) {
                editor.findPrevious({
                    wholeWord: false
                });
            },
            readOnly: true
        });

        command.define("Find:All", {
            doc: "Select all instances of the search term (or current word) and " + "place a cursor at each one.",
            exec: function(edit) {
                var phrase;
                if (edit.selection.isEmpty()) {
                    phrase = api.getIdentifierUnderCursor();
                } else {
                    phrase = edit.getSession().getTextRange(edit.getSelectionRange());
                }
                edit.findAll(phrase, {
                    wholeWord: false
                });
            },
            readOnly: true
        });

        command.define("Find:Next Instance Of Identifier", {
            doc: "Jump to the next occurence of the word currently under the cursor.",
            exec: function(edit) {
                if (edit.selection.isEmpty()) {
                    var range = api.getIdentifierUnderCursorRange();
                    edit.selection.setSelectionRange(range);
                }
                edit.findNext({
                    caseSensitive: true,
                    wholeWord: true
                });
            },
            readOnly: true
        });

        command.define("Find:Previous Instance Of Identifier", {
            doc: "Jump to the previous occurence of the word currently under the cursor.",
            exec: function(edit) {
                if (edit.selection.isEmpty()) {
                    var range = api.getIdentifierUnderCursorRange();
                    edit.selection.setSelectionRange(range);
                }
                edit.findPrevious({
                    caseSensitive: true,
                    wholeWord: true
                });
            },
            readOnly: true
        });

        sandboxes.defineInputable("cursor", function(session) {
            return session.selection.getCursor();
        });

        sandboxes.defineInputable("cursors", function(session) {
            return session.selection.getAllRanges().map(function(r) {
                return r.cursor || r.end;
            });
        });

        sandboxes.defineInputable("cursorIndex", function(session) {
            var cursor = session.selection.getCursor();
            var lines = session.getDocument().getAllLines();
            var index = cursor.column;
            lines.splice(cursor.row);
            while (lines.length > 0) {
                index += lines.pop().length + 1;
            }
            return index;
        });

        sandboxes.defineInputable("isInsertingSnippet", function() {
            return api.isInsertingSnippet();
        });

        sandboxes.defineInputable("lines", function(session) {
            return session.getDocument().getAllLines();
        });

        sandboxes.defineInputable("scrollPosition", function(session) {
            return {
                scrollTop: session.getScrollTop(),
                scrollLeft: session.getScrollLeft()
            };
        });

        sandboxes.defineInputable("selectionRange", function(session) {
            return session.selection.getRange();
        });

        sandboxes.defineInputable("selectionText", function(session) {
            return session.getTextRange(session.selection.getRange());
        });

        sandboxes.defineInputable("text", function(session) {
            return session.getValue();
        });

        sandboxes.defineInputable("modeName", function(session) {
            return session.mode.language;
        });

        sandboxes.defineInputable("mode", function(session) {
            return session.mode;
        });

        register(null, {
            editor: api
        });
    }
});
