define(function(require, exports, module) {
    var config = require("config");
    var editor = require("editor");
    var eventbus = require("eventbus");

    eventbus.declare("splitchange");
    
    function resetEditorDiv(el) {
        el.attr("class").split(/\s+/).forEach(function(cls) {
            if(cls.substring(0, "editor-".length) === "editor-") {
                el.removeClass(cls);
            }
        });
        return el;
    }
    
    function splitOne() {
        config.set("split", 1);
        resetEditorDiv($("#editor0")).addClass("editor-single");
        resetEditorDiv($("#editor1")).addClass("editor-disabled");
        resetEditorDiv($("#editor2")).addClass("editor-disabled");
        editor.getEditors().forEach(function(editor) {
            editor.resize();
        });
        eventbus.emit("splitchange", 1);
    }
    
    function splitTwo() {
        config.set("split", 2);
        resetEditorDiv($("#editor0")).addClass("editor-vsplit2-left");
        resetEditorDiv($("#editor1")).addClass("editor-vsplit2-right");
        resetEditorDiv($("#editor2")).addClass("editor-disabled");
        editor.getEditors().forEach(function(editor) {
            editor.resize();
        });
        eventbus.emit("splitchange", 2);
    }
    
    function splitThree() {
        config.set("split", 3);
        resetEditorDiv($("#editor0")).addClass("editor-vsplit3-left");
        resetEditorDiv($("#editor1")).addClass("editor-vsplit3-middle");
        resetEditorDiv($("#editor2")).addClass("editor-vsplit3-right");
        editor.getEditors().forEach(function(editor) {
            editor.resize();
        });
        eventbus.emit("splitchange", 3);
    }
    
    function switchSplit() {
        var editors = editor.getEditors();
        var activeEditor = editor.getActiveEditor();
        var idx = editors.indexOf(activeEditor);
        editor.setActiveEditor(editors[(idx + 1) % editors.length]);
    }

    exports.hook = function() {
        eventbus.once("keysbindable", function(keys) {
            keys.bind("Command-1", splitOne);
            keys.bind("Command-2", splitTwo);
            keys.bind("Command-3", splitThree);
            keys.bind("Command-0", switchSplit);
        });
        
        eventbus.on("configloaded", function() {
            switch(config.get("split")) {
                case 1:
                    splitOne();
                    break;
                case 2:
                    splitTwo();
                    break;
                case 3:
                    splitThree();
                    break;
                default:
                    splitOne();
            }
        });
    };
    
    
});
