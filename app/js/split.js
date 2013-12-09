/**
 * This module implements Zed's split views, it supports the following types of splits
 * - 1 split (full window)
 * - 2 vertical splits (with 3 variants: 50-50%, 33-66% and 66-33%)
 * - 3 vertical splits
 * - 2 vertical split with left one code editor and right one preview panel (handled in preview.js)
 */
/*global define, $, */
define(function(require, exports, module) {
    "use strict";
    var eventbus = require("./lib/eventbus");
    var state = require("./state");
    var editor = require("./editor");
    var command = require("./command");
    var config = require("./config");

    /**
     * Triggered when the active editor has changed
     * @param edit the new active editor
     */
    eventbus.declare("splitswitched");

    /**
     * Triggered when the split configuration has changed
     * @param config (1, 2, 3 or preview)
     */
    eventbus.declare("splitchange");

    function resetEditorDiv(el) {
        el.attr("class").split(/\s+/).forEach(function(cls) {
            if (cls.substring(0, "editor-".length) === "editor-") {
                el.removeClass(cls);
            }
        });
        return el;
    }
    exports.resetEditorDiv = resetEditorDiv;

    function splitOne() {
        state.set("split", "1");
        resetEditorDiv($("#editor0")).addClass("editor-single");
        resetEditorDiv($("#editor1")).addClass("editor-disabled");
        resetEditorDiv($("#editor2")).addClass("editor-disabled");
        editor.getEditors().forEach(function(editor) {
            editor.resize();
        });
        eventbus.emit("splitchange", "1");
    }

    function splitTwo(style) {
        if (style === undefined) {
            var currentSplit = "" + state.get("split") || "1";
            if (currentSplit.indexOf("2-") === 0) {
                // Increase by one
                style = (parseInt(currentSplit.substring(2), 10) + 1) % 3;
            } else {
                style = 0;
            }
        }
        state.set("split", "2-" + style);
        resetEditorDiv($("#editor0")).addClass("editor-vsplit2-left-" + style);
        resetEditorDiv($("#editor1")).addClass("editor-vsplit2-right-" + style);
        resetEditorDiv($("#editor2")).addClass("editor-disabled");
        editor.getEditors().forEach(function(editor) {
            editor.resize();
        });
        eventbus.emit("splitchange", "2-" + style);
    }

    function splitThree() {
        state.set("split", "3");
        resetEditorDiv($("#editor0")).addClass("editor-vsplit3-left");
        resetEditorDiv($("#editor1")).addClass("editor-vsplit3-middle");
        resetEditorDiv($("#editor2")).addClass("editor-vsplit3-right");
        editor.getEditors().forEach(function(editor) {
            editor.resize();
        });
        eventbus.emit("splitchange", "3");
    }

    function switchSplit() {
        var editors = editor.getEditors();
        var activeEditor = editor.getActiveEditor();
        var idx = editors.indexOf(activeEditor);
        activeEditor = editors[(idx + 1) % editors.length];
        editor.setActiveEditor(activeEditor);
        eventbus.emit("splitswitched", activeEditor);
    }
    
    var dimInactiveEditors = config.getPreference("dimInactiveEditors");
    function updateActiveEditorStylingOnConfigChange() {
        var newDimInactiveEditors = config.getPreference("dimInactiveEditors");
        if (newDimInactiveEditors !== dimInactiveEditors) {
            dimInactiveEditors = newDimInactiveEditors;
            if (dimInactiveEditors) {
                updateActiveEditorStyling();
            } else {
                editor.getEditors().forEach(function(edit) {
                    $(edit.container).removeClass("inactive-editor");
                });
            }
        }
    }

    function updateActiveEditorStyling() {
        if (dimInactiveEditors) {
            var activeEditor = editor.getActiveEditor();
            editor.getEditors().forEach(function(edit) {
                if (edit === activeEditor) {
                    $(edit.container).removeClass("inactive-editor");
                } else {
                    $(edit.container).addClass("inactive-editor");
                }
            });
        }
    }

    exports.hook = function() {
        eventbus.on("stateloaded", function() {
            if (!state.get("split")) {
                return splitOne();
            }
            switch (state.get("split")) {
                case "1":
                    splitOne();
                    break;
                case "2-0":
                    splitTwo(0);
                    break;
                case "2-1":
                    splitTwo(1);
                    break;
                case "2-2":
                    splitTwo(2);
                    break;
                case "3":
                    splitThree();
                    break;
            }
            eventbus.emit("splitswitched", editor.getActiveEditor());
        });

        eventbus.on("splitswitched", updateActiveEditorStyling);
        eventbus.on("configchanged", updateActiveEditorStylingOnConfigChange);
    };

    command.define("Split:One", {
        exec: splitOne,
        readOnly: true
    });
    command.define("Split:Vertical Two", {
        exec: function() {
            splitTwo();
        },
        readOnly: true
    });
    command.define("Split:Vertical Three", {
        exec: splitThree,
        readOnly: true
    });
    command.define("Split:Switch Focus", {
        exec: switchSplit,
        readOnly: true
    });
});