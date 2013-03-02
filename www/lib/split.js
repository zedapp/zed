define(function(require, exports, module) {
    var keys = require("keys");
    var config = require("config");
    var editor = require("editor");
    var eventbus = require("eventbus");
    
    function resetEditorDiv(el) {
        el.attr("class").split(/\s+/).forEach(function(cls) {
            if(cls.substring(0, "editor-".length) === "editor-")
                el.removeClass(cls);
        });
        return el;
    }
    
    function splitOne() {
        config.set("split", 1);
        
        resetEditorDiv($("#editor0")).addClass("editor-single");
        resetEditorDiv($("#editor1")).addClass("editor-disabled");
        
        editor.getEditors().forEach(function(editor) {
            editor.resize();
        });
    }
    
    function splitVertical() {
        config.set("split", 2);
        resetEditorDiv($("#editor0")).addClass("editor-vsplit-left");
        resetEditorDiv($("#editor1")).addClass("editor-vsplit-right");
        editor.getEditors().forEach(function(editor) {
            editor.resize();
        });
    }
    
    function splitHorizontal() {
        config.set("split", 3);
        resetEditorDiv($("#editor0")).addClass("editor-split-top");
        resetEditorDiv($("#editor1")).addClass("editor-split-bottom");
        editor.getEditors().forEach(function(editor) {
            editor.resize();
        });
    }
    
    keys.bind("Command-1", splitOne);
    keys.bind("Command-2", splitVertical);
    keys.bind("Command-3", splitHorizontal);
    
    eventbus.on("configloaded", function() {
        switch(config.get("split")) {
            case 1:
                splitOne();
                break;
            case 2:
                splitVertical();
                break;
            case 3:
                splitHorizontal();
                break;
            default:
                splitOne();
        }
    });
    
});
