define(function(require, exports, module) {
    var state = require("./state");
    var editor = require("./editor");
    var eventbus = require("./eventbus");
    var command = require("./command");

    eventbus.declare("splitswitched");
    eventbus.declare("splitchange");
    
    function resetEditorDiv(el) {
        el.attr("class").split(/\s+/).forEach(function(cls) {
            if(cls.substring(0, "editor-".length) === "editor-") {
                el.removeClass(cls);
            }
        });
        return el;
    }
    exports.resetEditorDiv = resetEditorDiv;
    
    function splitOne() {
        state.set("split", 1);
        resetEditorDiv($("#editor0")).addClass("editor-single");
        resetEditorDiv($("#editor1")).addClass("editor-disabled");
        resetEditorDiv($("#editor2")).addClass("editor-disabled");
        editor.getEditors().forEach(function(editor) {
            editor.resize();
        });
        eventbus.emit("splitchange", 1);
    }
    
    function splitTwo() {
        state.set("split", 2);
        resetEditorDiv($("#editor0")).addClass("editor-vsplit2-left");
        resetEditorDiv($("#editor1")).addClass("editor-vsplit2-right");
        resetEditorDiv($("#editor2")).addClass("editor-disabled");
        editor.getEditors().forEach(function(editor) {
            editor.resize();
        });
        eventbus.emit("splitchange", 2);
    }
    
    function splitThree() {
        state.set("split", 3);
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
        eventbus.emit("splitswitched", editor.getActiveEditor());
    }

    exports.hook = function() {
        eventbus.on("stateloaded", function() {
            if(!state.get("split")) {
                return splitOne();
            }
            switch(state.get("split")) {
                case 1:
                    splitOne();
                    break;
                case 2:
                    splitTwo();
                    break;
                case 3:
                    splitThree();
                    break;
            }
            eventbus.emit("splitswitched", editor.getActiveEditor());
        });
    };
    
    command.define("Split:One", {exec: splitOne, readOnly: true});
    command.define("Split:Vertical Two", {exec: splitTwo, readOnly: true});
    command.define("Split:Vertical Three", {exec: splitThree, readOnly: true});
    command.define("Split:Switch Focus", {exec: switchSplit, readOnly: true});
});
