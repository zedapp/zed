define(function(require, exports, module) {
    var eventbus = require("./eventbus");
    var command = require("./command");
    var state = require("./state");

    eventbus.declare("editorloaded");

    var editors = [];
    var activeEditor = null;

    var editor = module.exports = {
        extMapping: {
            "abap": "ace/mode/abap",
            "asciidoc": "ace/mode/asciidoc",
            "cpp": "ace/mode/c_cpp",
            "clj": "ace/mode/clojure",
            "coffee": "ace/mode/coffee",
            "cf": "ace/mode/coldfusion",
            "cs": "ace/mode/csharp",
            "css": "ace/mode/css",
            "curly": "ace/mode/curly",
            "dart": "ace/mode/dart",
            "diff": "ace/mode/diff",
            "dot": "ace/mode/dot",
            "golang": "ace/mode/golang",
            "groovy": "ace/mode/groovy",
            "haml": "ace/mode/haml",
            "haxe": "ace/mode/haxe",
            "html": "ace/mode/html",
            "jade": "ace/mode/jade",
            "java": "ace/mode/java",
            "js": "ace/mode/javascript",
            "json": "ace/mode/json",
            "jsp": "ace/mode/jsp",
            "jsx": "ace/mode/jsx",
            "ltx": "ace/mode/latex",
            "less": "ace/mode/less",
            "liquid": "ace/mode/liquid",
            "lisp": "ace/mode/lisp",
            "lua": "ace/mode/lua",
            "lucene": "ace/mode/lucene",
            "logic": "ace/mode/logiql",
            "Makefile": "ace/mode/makefile",
            "md": "ace/mode/markdown",
            "m": "ace/mode/objectivec",
            "ocaml": "ace/mode/ocaml",
            "pl": "ace/mode/perl",
            "psql": "ace/mode/pgsql",
            "php": "ace/mode/php",
            "php": "ace/mode/php",
            "py": "ace/mode/python",
            "r": "ace/mode/r",
            "rdoc": "ace/mode/rdoc",
            "rhtml": "ace/mode/rhtml",
            "ruby": "ace/mode/ruby",
            "scad": "ace/mode/scad",
            "scala": "ace/mode/scala",
            "scheme": "ace/mode/scheme",
            "scss": "ace/mode/scss",
            "sh": "ace/mode/sh",
            "sql": "ace/mode/sql",
            "stylus": "ace/mode/stylus",
            "svg": "ace/mode/svg",
            "tcl": "ace/mode/tcl",
            "tex": "ace/mode/tex",
            "text": "ace/mode/text",
            "textile": "ace/mode/textile",
            "tm_snippet": "ace/mode/tm_snippet",
            "typescript": "ace/mode/typescript",
            "vbscript": "ace/mode/vbscript",
            "xml": "ace/mode/xml",
            "xquery": "ace/mode/xquery",
            "yaml": "ace/mode/yaml"
        },
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
            eventbus.on("stateloaded", function(state) {
                var theme = state.get("editor.theme");
                if (theme) {
                    editor.getEditors(true).forEach(function(edit) {
                        edit.setTheme(theme);
                    });
                }
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
                editor.setHighlightActiveLine(false);
                editor.setTheme("ace/theme/cobalt");
                editor.on("focus", function() {
                    activeEditor = editor;
                    editor.setHighlightActiveLine(true);
                });
                editor.on("blur", function() {
                    activeEditor = editor;
                    editor.setHighlightActiveLine(false);
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
            session.setUseWrapMode(!!state.get('wordwrap'));
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
            return {
                scrollTop: session.getScrollTop(),
                scrollLeft: session.getScrollLeft(),
                selection: session.getSelection().getRange(),
                lastUse: session.lastUse,
                undo: session.getUndoManager().$undoStack,
                redo: session.getUndoManager().$redoStack,
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
        exec: function(editor) {
            var line = parseInt(prompt("Enter line number:"), 10);
            if (!isNaN(line)) {
                editor.gotoLine(line);
            }
        },
        readOnly: true
    });
    
    command.define("Editor:Toggle Word Wrap", {
        exec: function(editor) {
            require(["./session_manager"], function(session_manager) {
                var sessions = session_manager.getSessions();
                state.set("wordwrap", !state.get("wordwrap"));
                Object.keys(sessions).forEach(function(path) {
                    sessions[path].setUseWrapMode(state.get("wordwrap"));
                });
            });
        },
        readOnly: true
    })

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

        command.define("Editor:Theme:" + name, {
            exec: function() {
                require(["state"], function(state) {
                    editor.getEditors(true).forEach(function(edit) {
                        edit.setTheme(theme);
                        state.set("editor.theme", theme);
                    });
                });
            },
            readOnly: true
        });
    });
});