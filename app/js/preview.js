/**
 * Implements the preview split mode
 */
// TODO: Redo all of this, it's messy and buggy
/*global define, $, _ */
define(function(require, exports, module) {
    var resetEditorDiv = require("./split").resetEditorDiv;
    var switchSplit = require("./split").switchSplit;
    var state = require("./state");
    var editor = require("./editor");
    var command = require("./command");
    var eventbus = require("./lib/eventbus");

    var previewWrapperEl;
    var previewEl;
    var previewScrollY = 0;

    eventbus.declare("preview");

    function isPreviewing() {
        var splitState = state.get("split");
        return splitState && ("" + splitState).indexOf("preview-") === 0;
    }

    function update() {
        if (!isPreviewing()) {
            return;
        }
        var session = editor.getActiveSession();
        eventbus.emit("preview", session);
    }

    var delayedUpdate = _.debounce(update, 500);

    function splitPreview(style) {
        if (style === undefined) {
            var currentSplit = "" + state.get("split") || "";
            if (currentSplit.indexOf("preview-") === 0) {
                // Increase by one
                style = (parseInt(currentSplit.substring("preview-".length), 10) + 1) % 3;
            } else {
                style = 0;
            }
        }
        state.set("split", "preview-" + style);
        resetEditorDiv($("#editor0")).addClass("editor-vsplit2-left-" + style);
        resetEditorDiv($("#editor1")).addClass("editor-disabled");
        resetEditorDiv($("#editor2")).addClass("editor-disabled");
        previewWrapperEl.attr("class", "preview-vsplit2-right-" + style);
        previewWrapperEl.show();
        
        var editors = editor.getEditors(true);
        var activeEditor = editor.getActiveEditor();
        if(editors[0] !== activeEditor) {
            var session = activeEditor.getSession();
            activeEditor.setSession(editors[0].getSession());
            editors[0].setSession(session);
        }

        editor.getEditors(true).forEach(function(editor) {
            editor.resize();
        });
        switchSplit();
        eventbus.emit("splitchange", "preview-" + style);
        setTimeout(update, 200);
    }

    exports.hook = function() {
        eventbus.on("allsessionsloaded", function() {
            previewScrollY = state.get("preview.scrollY") || 0;
            var splitState = state.get("split");
            if (splitState && ("" + splitState).indexOf("preview-") === 0) {
                splitPreview(parseInt(splitState.substring("preview-".length), 10));
            }
        });
        eventbus.on("splitchange", function(type) {
            if (type.indexOf("preview-") === -1) {
                // Not a preview split, hide the preview
                previewWrapperEl.hide();
            }
        });
        eventbus.on("sessionchanged", delayedUpdate);
        eventbus.on("switchsession", delayedUpdate);
    };

    exports.showPreview = function(html) {
        previewEl[0].contentWindow.postMessage({
            content: html
        }, "*");
    };

    exports.init = function() {
        var data = "data:text/html," + require("text!../preview.html");
        previewWrapperEl = $("<div id='preview-wrapper' class='preview-vsplit2-right'><webview id='preview'>").hide();
        $("body").append(previewWrapperEl);
        previewEl = $("#preview");
        previewEl.attr("src", data);
    };

    command.define("Split:Preview", {
        exec: function() {
            splitPreview();
        },
        readOnly: true
    });
});