define(function(require, exports, module) {
    "use strict";
    var eventbus = require("./eventbus");
    var command = require("./command");
    var settings = require("./settings");
    var defaultSettings = JSON.parse(require("text!../settings/settings.json"));

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
                editor.extMapping = settings.get("fileExtensions");
                editor.getEditors(true).forEach(function(edit) {
                    edit.setTheme(settings.get("theme"));
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
                        sessions[path].setUseWrapMode(settings.get("wordWrap"));
                    });
                });
            });
        },
        init: function() {
            $("body").append("<div id='editor0' class='editor-single'>");
            $("body").append("<div id='editor1' class='editor-disabled'>");
            $("body").append("<div id='editor2' class='editor-disabled'>");
            editors.push(ace.edit("editor0"));
            editors.push(ace.edit("editor1"));
            editors.push(ace.edit("editor2"));

            editors.forEach(function(editor) {
                editor.setShowPrintMargin(false);
                editor.on("focus", function() {
                    activeEditor = editor;
                });
            });

            editor.setActiveEditor(editors[0]);
            eventbus.emit("editorloaded", exports);

        },
        createSession: function(path, content) {
            var parts = path.split(".");
            var ext = parts[parts.length - 1];
            var mode = "text";
            if (editor.extMapping[ext]) {
                mode = editor.extMapping[ext];
            }
            var session = ace.createEditSession(content);
            session.setMode(mode);
            session.setUseWrapMode(settings.get("wordWrap"));
            session.mode = mode;
            session.filename = path;
            return session;
        },
        switchSession: function(session, edit) {
            edit = edit || editor.getActiveEdtor();
            edit.setSession(session);
            eventbus.emit("switchsession", edit, session);
        },
        setMode: function(ext, modeModule) {
            editor.extMapping[ext] = modeModule;
        },
        getActiveEditor: function() {
            return activeEditor;
        },
        setActiveEditor: function(editor) {
            activeEditor = editor;
            activeEditor.focus();
        },
        getEditors: function(all) {
            if (all) return editors;

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
                mode: session.getMode().$id
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
                        })
                    });
                });
            }
            session.getSelection().setSelectionRange(state.selection, false);
            session.setScrollTop(state.scrollTop);
            session.setScrollLeft(state.scrollLeft);
            session.setMode(state.mode);
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
            if (!regex.test(line[cursor.column])) return "";

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

    command.define("Editor:Select All", {
        exec: function(editor) {
            editor.selectAll();
        },
        readOnly: true
    });

    command.define("Editor:Center Selection", {
        exec: function(editor) {
            editor.centerSelection();
        },
        readOnly: true
    });

    command.define("Editor:Goto Line", {
        exec: function(edit) {
            command.exec("File:Goto", edit, ":");
        },
        readOnly: true
    });

    command.define("Editor:Find", {
        exec: function(edit) {
            command.exec("File:Goto", edit, ":/");
        },
        readOnly: true
    });

    command.define("Settings:Toggle Word Wrap", {
        exec: function(editor) {
            require(["./session_manager"], function(session_manager) {
                settings.set("wordWrap", !settings.get("wordWrap"));
            });
        },
        readOnly: true
    });

    command.define("Navigate:Next Instance Of Identifier", {
        exec: function(edit) {
            if (edit.selection.isEmpty()) {
                var range = editor.getIdentifierUnderCursorRange();
                edit.selection.setSelectionRange(range);
            }
            edit.findNext();
        }
    });

    command.define("Navigate:Previous Instance Of Identifier", {
        exec: function(edit) {
            if (edit.selection.isEmpty()) {
                var range = editor.getIdentifierUnderCursorRange();
                edit.selection.setSelectionRange(range);
            }
            edit.findPrevious();
        }
    });

    command.define("Cursor:Add At Next Instance Of Identifier", {
        exec: function(edit) {
            if (edit.selection.isEmpty()) {
                var range = editor.getIdentifierUnderCursorRange();
                edit.selection.setSelectionRange(range);
            }
            edit.selectMore(1);
        }
    });
    
    command.define("Cursor:Add At Previous Instance Of Identifier", {
        exec: function(edit) {
            if (edit.selection.isEmpty()) {
                var range = editor.getIdentifierUnderCursorRange();
                edit.selection.setSelectionRange(range);
            }
            edit.selectMore(-1);
        }
    });

    command.define("Edit:Goto Path Under Cursor", {
        exec: function(edit) {
            var path = editor.getPathUnderCursor();
            command.exec("File:Goto", edit, path);
        }
    });

    command.define("Cursor:Add Above", {
        exec: function(editor) {
            editor.selectMoreLines(-1);
        },
        readonly: true
    });

    command.define("Cursor:Add Below", {
        exec: function(editor) {
            editor.selectMoreLines(1);
        },
        readonly: true
    });

    Object.keys(editor.extMapping).forEach(function(ext) {
        var module = editor.extMapping[ext];
        var parts = module.split('/');
        var name = parts[parts.length - 1];
        name = name[0].toUpperCase() + name.substring(1).replace("_", " ");

        command.define("Editor:Mode:" + name, {
            exec: function(editor) {
                editor.getSession().setMode(module);
            },
            readOnly: true
        });
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