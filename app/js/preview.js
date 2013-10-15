/*global define, $, _ */
// TODO: Redo all of this, it's messy and buggy
define(function(require, exports, module) {
    var resetEditorDiv = require("./split").resetEditorDiv;
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
        update();

        editor.getEditors().forEach(function(editor) {
            editor.resize();
        });
        eventbus.emit("splitchange", "preview-" + style);
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
        /*
        window.addEventListener("message", function(event) {
            var data = event.data;
            if(typeof data === "string" && data.indexOf("preview-scroll: ") === 0) {
                previewScrollY = +data.substring("preview-scroll: ".length);
                state.set("preview.scrollY", previewScrollY);
            }
        });*/
    };

    exports.showPreview = function(html) {
        previewEl[0].contentWindow.postMessage({
            content: html
        }, "*");
    };

    exports.init = function() {
        previewWrapperEl = $("<div class='preview-vsplit2-right'><iframe id='preview' src='preview.html'>").hide();
        previewWrapperEl.css("top", "25px");
        $("body").append(previewWrapperEl);
        previewEl = $("#preview");
        /*previewEl.load(function() {
            previewEl[0].contentWindow.postMessage(previewScrollY, "*");
        });*/
    };

    command.define("Split:Preview", {
        exec: function() {
            splitPreview();
        },
        readOnly: true
    });
});