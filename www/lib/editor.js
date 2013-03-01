define(function(require, exports, module) {
    require("ace/ace");

    var eventbus = require("eventbus");

    var editor = module.exports = {
        buffers: {},
        ace: null, // Set during init
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
        ace: editor,
        createSession: function(path, content) {
            var parts = path.split(".");
            var ext = parts[parts.length - 1];
            var mode = "text";
            if(editor.extMapping[ext]) {
                mode = editor.extMapping[ext];
            }
            var session = ace.createEditSession(content);
            session.setMode(mode);
            return session;
        },
        switchSession: function(session) {
            editor.ace.setSession(session);
        },
        setMode: function(ext, modeModule) {
            editor.extMapping[ext] = modeModule;
        }
    };

    $("body").append("<div id='editor'>");
    editor.ace = ace.edit("editor");

    eventbus.emit("editorloaded");
    editor.ace.focus();
});
