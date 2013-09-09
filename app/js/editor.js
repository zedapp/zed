/*global define $ ace */
define(function(require, exports, module) {
    "use strict";
    var eventbus = require("./lib/eventbus");
    var command = require("./command");
    var settings = require("./settings");
    var defaultSettings = JSON.parse(require("text!../settings/settings.default.json"));
    var modes = require("./modes");
    var whitespace = ace.require("ace/ext/whitespace");

    var IDENT_REGEX = /[a-zA-Z0-9_$\-]+/;
    var PATH_REGEX = /[\/\.a-zA-Z0-9_$\-]+/;

    eventbus.declare("editorloaded");

    var editors = [];
    var activeEditor = null;

    var editor = module.exports = {
        extMapping: defaultSettings.fileExtensions,
        themes: ["ace/theme/ambiance", "ace/theme/chaos",
            "ace/theme/chrome", "ace/theme/clouds",
            "ace/theme/clouds_midnight", "ace/theme/cobalt",
            "ace/theme/crimson_editor", "ace/theme/dawn",
            "ace/theme/dreamweaver", "ace/theme/eclipse",
            "ace/theme/github", "ace/theme/idle_fingers", "ace/theme/kr",
            "ace/theme/merbivore", "ace/theme/merbivore_soft",
            "ace/theme/mono_industrial", "ace/theme/monokai",
            "ace/theme/pastel_on_dark", "ace/theme/solarized_dark",
            "ace/theme/solarized_light", "ace/theme/textmate",
            "ace/theme/tomorrow", "ace/theme/tomorrow_night",
            "ace/theme/tomorrow_night_blue", "ace/theme/tomorrow_night_bright",
            "ace/theme/tomorrow_night_eighties", "ace/theme/twilight",
            "ace/theme/vibrant_ink", "ace/theme/xcode"],
        hook: function() {
            eventbus.on("settingschanged", function(settings) {
                editor.getEditors(true).forEach(function(edit) {
                    edit.setTheme(settings.get("theme"));
                    edit.renderer.once("themeLoaded", function(event) {
                        var theme = event.theme;
                        if(theme.isDark) {
                            $("body").addClass("black");
                        } else {
                            $("body").removeClass("black");
                        }
                    });
                    edit.setHighlightActiveLine(settings.get("highlightActiveLine"));
                    edit.setHighlightGutterLine(settings.get("highlightGutterLine"));
                    edit.setFontSize(settings.get("fontSize"));
                    edit.setShowPrintMargin(settings.get("showPrintMargin"));
                    edit.setPrintMarginColumn(settings.get("printMarginColumn"));
                    edit.setShowInvisibles(settings.get("showInvisibles"));
                    edit.setDisplayIndentGuides(settings.get("displayIndentGuides"));
                    edit.setAnimatedScroll(settings.get("animatedScroll"));
                    edit.setShowFoldWidgets(settings.get("showFoldWidgets"));
                    edit.setScrollSpeed(settings.get("scrollSpeed"));
                    edit.renderer.setShowGutter(settings.get("showGutter"));
                    edit.setHighlightSelectedWord(settings.get("highlightSelectedWord"));
                    edit.setBehavioursEnabled(settings.get("behaviorsEnabled")); // ( -> ()
                    edit.setWrapBehavioursEnabled(settings.get("wrapBehaviorsEnabled")); // same as above but with selection
                });
                require(["./session_manager"], function(session_manager) {
                    var sessions = session_manager.getSessions();
                    Object.keys(sessions).forEach(function(path) {
                        sessions[path].setTabSize(settings.get("tabSize"));
                        sessions[path].setUseSoftTabs(settings.get("useSoftTabs"));
                        sessions[path].setUseWrapMode(settings.get("wordWrap"));
                    });
                });
            });

            eventbus.on("filedeleted", function(path) {
                require(["./session_manager"], function(session_manager) {
                    editors.forEach(function(edit) {
                        if (edit.getSession().filename === path) {
                            session_manager.go("zed:start", edit);
                        }
                    });
                });
            });
        },
        init: function() {
            $("body").append("<div id='editor0' class='editor-single'>");
            $("body").append("<div id='editor1' class='editor-disabled'>");
            $("body").append("<div id='editor2' class='editor-disabled'>");

            ace.config.setDefaultValue("editor", "enableBasicAutocompletion", true);

            editors.push(ace.edit("editor0"));
            editors.push(ace.edit("editor1"));
            editors.push(ace.edit("editor2"));

            editors.forEach(function(editor) {
                editor.setShowPrintMargin(false);
                editor.on("focus", function() {
                    activeEditor = editor;
                    eventbus.emit("splitswitched", editor);
                });
            });

            editor.setActiveEditor(editors[0]);
            eventbus.emit("editorloaded", exports);
        },
        createSession: function(path, content) {
            var mode = modes.getModeForPath(path);
            var session = ace.createEditSession(content);
            session.filename = path;
            session.setUseWrapMode(settings.get("wordWrap"));
            session.setTabSize(settings.get("tabSize"));
            session.setUseSoftTabs(settings.get("useSoftTabs"));
            session.setUseWorker(false);
            modes.setSessionMode(session, mode);
            if (settings.get("detectIndentation")) whitespace.detectIndentation(session);
            return session;
        },
        switchSession: function(session, edit) {
            edit = edit || editor.getActiveEditor();
            edit.setSession(session);
            edit.setReadOnly( !! session.readOnly);
            eventbus.emit("switchsession", edit, session);
        },
        getActiveEditor: function() {
            return activeEditor;
        },
        setActiveEditor: function(editor) {
            activeEditor = editor;
            activeEditor.focus();
        },
        getEditors: function(all) {
            if (all) {
                return editors;
            }

            return editors.filter(function(edit) {
                return $(edit.container).is(':visible');
            });
        },
        getActiveSession: function() {
            return editor.getActiveEditor().getSession();
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
                redo: redoStack,
                mode: session.mode.language
            };
        },
        setSessionState: function(session, state) {
            var Range = ace.require("ace/range").Range;

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
            modes.setSessionMode(session, state.mode);
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
            edit = edit || editor.getActiveEditor();
            return edit.getSession().getTextRange(editor.getIdentifierUnderCursorRange(edit, regex));
        },
        getIdentifierUnderCursorRange: function(edit, regex) {
            regex = regex || IDENT_REGEX;
            edit = edit || editor.getActiveEditor();
            var Range = ace.require("ace/range").Range;
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
            return editor.getIdentifierUnderCursor(edit, PATH_REGEX);
        }
    };
    
    function find(session, needle, dir) {
        var Search = ace.require("./search").Search;
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
        exec: function(edit) {
            command.exec("Navigate:Goto", edit, ":");
        },
        readOnly: true
    });
    
    command.define("Navigate:Path Under Cursor", {
        exec: function(edit) {
            var path = editor.getPathUnderCursor();
            command.exec("Navigate:Goto", edit, path);
        }
    });

    // FOLD
    command.define("Fold:Fold", {
        exec: function(editor) {
            editor.session.toggleFold(false);
        },
        readOnly: true
    });
    
    command.define("Fold:Unfold", {
        exec: function(editor) {
            editor.session.toggleFold(true);
        },
        readOnly: true
    });

    command.define("Fold:Fold All", {
        exec: function(editor) {
            editor.session.foldAll();
        },
        readOnly: true
    });
    
    command.define("Fold:Unfold All", {
        exec: function(editor) {
            editor.session.unfold();
        },
        readOnly: true
    });


    // SELECT
    command.define("Select:Up", {
        exec: function(editor) {
            editor.getSelection().selectUp();
        },
        multiSelectAction: "forEach",
        readOnly: true
    });
    
    command.define("Select:All", {
        exec: function(editor) {
            editor.selectAll();
        },
        readOnly: true
    });
    
    command.define("Select:To File End", {
        exec: function(editor) {
            editor.getSelection().selectFileEnd();
        },
        multiSelectAction: "forEach",
        readOnly: true
    });

    command.define("Select:Down", {
        exec: function(editor) {
            editor.getSelection().selectDown();
        },
        multiSelectAction: "forEach",
        readOnly: true
    });

    command.define("Select:Word Left", {
        exec: function(editor) {
            editor.getSelection().selectWordLeft();
        },
        multiSelectAction: "forEach",
        readOnly: true
    });
    
    command.define("Select:To Line Start", {
        exec: function(editor) {
            editor.getSelection().selectLineStart();
        },
        multiSelectAction: "forEach",
        readOnly: true
    });

    command.define("Select:Left", {
        exec: function(editor) {
            editor.getSelection().selectLeft();
        },
        multiSelectAction: "forEach",
        readOnly: true
    });

    command.define("Select:Word Right", {
        exec: function(editor) {
            editor.getSelection().selectWordRight();
        },
        multiSelectAction: "forEach",
        readOnly: true
    });

    command.define("Select:To Line End", {
        exec: function(editor) {
            editor.getSelection().selectLineEnd();
        },
        multiSelectAction: "forEach",
        readOnly: true
    });

    command.define("Select:Right", {
        exec: function(editor) {
            editor.getSelection().selectRight();
        },
        multiSelectAction: "forEach",
        readOnly: true
    });
    command.define("Select:Page Down", {
        exec: function(editor) {
            editor.selectPageDown();
        },
        readOnly: true
    });

    command.define("Select:To Matching Brace", {
        exec: function(editor) {
            editor.jumpToMatching(true);
        },
        multiSelectAction: "forEach",
        readOnly: true
    });

    command.define("Select:Page Up", {
        exec: function(editor) {
            editor.selectPageDown();
        },
        readOnly: true
    });
    
    command.define("Select:To File Start", {
        exec: function(editor) {
            editor.getSelection().selectFileStart();
        },
        readOnly: true
    });
    
    command.define("Select:Duplicate", {
        exec: function(editor) {
            editor.duplicateSelection();
        },
        multiSelectAction: "forEach"
    });


    // CURSOR
    command.define("Cursor:Up", {
        exec: function(editor, args) {
            editor.navigateUp(args.times);
        },
        multiSelectAction: "forEach",
        readOnly: true
    });

    command.define("Cursor:Down", {
        exec: function(editor, args) {
            editor.navigateDown(args.times);
        },
        multiSelectAction: "forEach",
        readOnly: true
    });

    command.define("Cursor:File Start", {
        exec: function(editor) {
            editor.navigateFileStart();
        },
        multiSelectAction: "forEach",
        readOnly: true
    });

    command.define("Cursor:File End", {
        exec: function(editor) {
            editor.navigateFileEnd();
        },
        multiSelectAction: "forEach",
        readOnly: true
    });

    command.define("Cursor:Word Left", {
        exec: function(editor) {
            editor.navigateWordLeft();
        },
        multiSelectAction: "forEach",
        readOnly: true
    });
    
    command.define("Cursor:Word Right", {
        exec: function(editor) {
            editor.navigateWordRight();
        },
        multiSelectAction: "forEach",
        readOnly: true
    });

    command.define("Cursor:Line Start", {
        exec: function(editor) {
            editor.navigateLineStart();
        },
        multiSelectAction: "forEach",
        readOnly: true
    });

    command.define("Cursor:Left", {
        exec: function(editor, args) {
            editor.navigateLeft(args.times);
        },
        multiSelectAction: "forEach",
        readOnly: true
    });

    command.define("Cursor:Line End", {
        exec: function(editor) {
            editor.navigateLineEnd();
        },
        multiSelectAction: "forEach",
        readOnly: true
    });

    command.define("Cursor:Right", {
        exec: function(editor, args) {
            editor.navigateRight(args.times);
        },
        multiSelectAction: "forEach",
        readOnly: true
    });

    command.define("Cursor:Page Down", {
        exec: function(editor) {
            editor.gotoPageDown();
        },
        readOnly: true
    });

    command.define("Cursor:Page Up", {
        exec: function(editor) {
            editor.gotoPageUp();
        },
        readOnly: true
    });
    
    command.define("Cursor:To Matching Brace", {
        exec: function(editor) {
            editor.jumpToMatching();
        },
        multiSelectAction: "forEach",
        readOnly: true
    });
    
    command.define("Cursor:Center", {
        exec: function(editor) {
            editor.centerSelection();
        },
        readOnly: true
    });

    // Cursor: Multiple
    command.define("Cursor:Multiple:Add At Next Instance Of Identifier", {
        exec: function(edit) {
            if (edit.selection.isEmpty()) {
                var range = editor.getIdentifierUnderCursorRange();
                edit.selection.setSelectionRange(range);
            }
            selectMore(edit, 1);
        }
    });

    command.define("Cursor:Multiple:Add At Previous Instance Of Identifier", {
        exec: function(edit) {
            if (edit.selection.isEmpty()) {
                var range = editor.getIdentifierUnderCursorRange();
                edit.selection.setSelectionRange(range);
            }
            selectMore(edit, -1);
        }
    });
    
    command.define("Cursor:Multiple:Add Above", {
        exec: function(editor) {
            editor.selectMoreLines(-1);
        },
    });

    command.define("Cursor:Multiple:Add Below", {
        exec: function(editor) {
            editor.selectMoreLines(1);
        },
    });
    
    // SCROLL
    
    command.define("Scroll:Page Down", {
        exec: function(editor) {
            editor.scrollPageDown();
        },
        readOnly: true
    });
    command.define("Scroll:Page Up", {
        exec: function(editor) {
            editor.scrollPageUp();
        },
        readOnly: true
    });

    command.define("Scroll:Down", {
        exec: function(e) {
            e.renderer.scrollBy(0, 2 * e.renderer.layerConfig.lineHeight);
        },
        readOnly: true
    });
    command.define("Scroll:Up", {
        exec: function(e) {
            e.renderer.scrollBy(0, -2 * e.renderer.layerConfig.lineHeight);
        },
        readOnly: true
    });
    
    // MACRO
    command.define("Macro:Toggle Recording", {
        exec: function(editor) {
            editor.commands.toggleRecording(editor);
        },
        readOnly: true
    });
    
    command.define("Macro:Replay", {
        exec: function(editor) {
            editor.commands.replay(editor);
        },
        readOnly: true
    });
    
    // EDIT
    command.define("Edit:Remove Line", {
        exec: function(editor) {
            editor.removeLines();
        },
        multiSelectAction: "forEach"
    });
    
    command.define("Edit:Toggle Comment", {
        exec: function(editor) {
            editor.toggleCommentLines();
        },
        multiSelectAction: "forEach"
    });
    command.define("Edit:Number:Increase", {
        exec: function(editor) {
            editor.modifyNumber(1);
        },
        multiSelectAction: "forEach"
    });
    command.define("Edit:Number:Decrease", {
        exec: function(editor) {
            editor.modifyNumber(-1);
        },
        multiSelectAction: "forEach"
    });
    command.define("Edit:Undo", {
        exec: function(editor) {
            editor.undo();
        }
    });
    command.define("Edit:Redo", {
        exec: function(editor) {
            editor.redo();
        }
    });
    command.define("Edit:Copy Lines Up", {
        exec: function(editor) {
            editor.copyLinesUp();
        }
    });
    command.define("Edit:Move Lines Up", {
        exec: function(editor) {
            editor.moveLinesUp();
        }
    });
    command.define("Edit:Copy Lines Down", {
        exec: function(editor) {
            editor.copyLinesDown();
        }
    });
    command.define("Edit:Move Lines Down", {
        exec: function(editor) {
            editor.moveLinesDown();
        }
    });
    command.define("Edit:Delete", {
        exec: function(editor) {
            editor.remove("right");
        },
        multiSelectAction: "forEach"
    });
    command.define("Edit:Backspace", {
        exec: function(editor) {
            editor.remove("left");
        },
        multiSelectAction: "forEach"
    });

    command.define("Edit:Remove To Line Start", {
        exec: function(editor) {
            editor.removeToLineStart();
        },
        multiSelectAction: "forEach"
    });
    
    command.define("Edit:Remove To Line End", {
        exec: function(editor) {
            editor.removeToLineEnd();
        },
        multiSelectAction: "forEach"
    });
    
    command.define("Edit:Outdent", {
        exec: function(editor) {
            editor.blockOutdent();
        },
        multiSelectAction: "forEach"
    });
    
    command.define("Edit:Indent", {
        exec: function(editor) {
            editor.indent();
        },
        multiSelectAction: "forEach"
    });
    
    command.define("Edit:Block Outdent", {
        exec: function(editor) {
            editor.blockOutdent();
        },
        multiSelectAction: "forEach"
    });
    
    command.define("Edit:Block Indent", {
        exec: function(editor) {
            editor.blockIndent();
        },
        multiSelectAction: "forEach"
    });
    
    command.define("Edit:Split Line", {
        exec: function(editor) {
            editor.splitLine();
        },
        multiSelectAction: "forEach"
    });
    
    command.define("Edit:Transpose Letters", {
        exec: function(editor) {
            editor.transposeLetters();
        },
        multiSelectAction: function(editor) {
            editor.transposeSelections(1);
        }
    });

    command.define("Edit:Uppercase", {
        exec: function(editor) {
            editor.toUpperCase();
        },
        multiSelectAction: "forEach"
    });

    command.define("Edit:Lowercase", {
        exec: function(editor) {
            editor.toLowerCase();
        },
        multiSelectAction: "forEach"
    });

    command.define("Edit:Remove Word Left", {
        exec: function(editor) {
            editor.removeWordLeft();
        },
        multiSelectAction: "forEach"
    });

    command.define("Edit:Remove Word Right", {
        exec: function(editor) {
            editor.removeWordRight();
        },
        multiSelectAction: "forEach"
    });

    command.define("Edit:Overwrite Mode", {
        exec: function(editor) {
            editor.toggleOverwrite();
        }
    });
    
    command.define("Edit:Detect Indentation", {
        exec: function(editor) {
            whitespace.detectIndentation(editor.session);
        }
    });

    command.define("Edit:Trim Trailing Space", {
        exec: function(editor) {
            whitespace.trimTrailingSpace(editor.session);
        }
    });

    command.define("Edit:Convert Indentation", {
        exec: function(editor) {
            // todo this command needs a way to get values for tabChar and tabLength
            whitespace.convertIndentation(editor.session);
        }
    });


    // FIND
    command.define("Find:Find", {
        exec: function(edit) {
            command.exec("Navigate:Goto", edit, ":/");
        },
        readOnly: true
    });
    
    command.define("Find:Next", {
        exec: function(editor) {
            editor.findNext();
        },
        readOnly: true
    });

    command.define("Find:Previous", {
        exec: function(editor) {
            editor.findPrevious();
        },
        readOnly: true
    });
    
    command.define("Find:Next Instance Of Identifier", {
        exec: function(edit) {
            if (edit.selection.isEmpty()) {
                var range = editor.getIdentifierUnderCursorRange();
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
        exec: function(edit) {
            if (edit.selection.isEmpty()) {
                var range = editor.getIdentifierUnderCursorRange();
                edit.selection.setSelectionRange(range);
            }
            edit.findPrevious({
                caseSensitive: true,
                wholeWord: true
            });
        },
        readOnly: true
    });
    
    // SETTINGS
    command.define("Settings:Toggle Word Wrap", {
        exec: function() {
            settings.set("wordWrap", !settings.get("wordWrap"));
        },
        readOnly: true
    });

    editor.themes.forEach(function(theme) {
        var parts = theme.split('/');
        var name = parts[parts.length - 1];
        name = name[0].toUpperCase() + name.substring(1).replace("_", " ");

        command.define("Settings:Theme:" + name, {
            exec: function() {
                settings.set("theme", theme);
            },
            readOnly: true
        });
    });

    
});