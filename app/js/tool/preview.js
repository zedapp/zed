/*global define $ _ */
define(function(require, exports, module) {
    var resetEditorDiv = require("../split").resetEditorDiv;
    var state = require("../state");
    var editor = require("../editor");
    var command = require("../command");
    var eventbus = require("../lib/eventbus");
    var tools = require("../tools");
    var session_manager = require("../session_manager");
    
    var previewWrapperEl;
    var previewEl;
    var previewSession;
    var previewScrollY = 0;
    
    function update() {
        if(!previewSession) {
            return;
        }
        eventbus.emit("sessionactivitystarted", previewSession, "Updating preview");
        tools.run(previewSession, "preview", {}, previewSession.getValue(), function(err, result) {
            if(err) {
                result = "Not supported.";
                eventbus.emit("sessionactivityfailed", previewSession, "No preview available");
            } else {
                eventbus.emit("sessionactivitycompleted", previewSession);
            }
            previewEl[0].contentWindow.postMessage({content: result}, "*");
        });
    }
    
    var delayedUpdate = _.debounce(update, 500);
    
    function splitPreview(style, path) {
        var oldPreviewSession = previewSession;
        if(path) {
            previewSession = session_manager.getSessions()[path];
        } else {
            previewSession = editor.getActiveSession();
        }
        if(oldPreviewSession !== previewSession) {
            update();
            return;
        }
        
        if(style === undefined) {
            var currentSplit = ""+state.get("split") || "";
            if(currentSplit.indexOf("preview-") === 0) {
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
        state.set('preview.path', previewSession.filename);
        
        editor.getEditors().forEach(function(editor) {
            editor.resize();
        });
        eventbus.emit("splitchange", "preview-" + style);
    }
    
    exports.hook = function() {
        eventbus.on("allsessionsloaded", function() {
            previewScrollY = state.get("preview.scrollY") || 0;
            var splitState = state.get("split");
            if(splitState && (""+splitState).indexOf("preview-") === 0) {
                splitPreview(parseInt(splitState.substring("preview-".length), 10),
                             state.get('preview.path'));
            }
        });
        eventbus.on("splitchange", function(type) {
            if(type.indexOf("preview-") === -1) {
                // Not a preview split, hide the preview
                previewWrapperEl.hide();
                previewSession = null;
            }
        });
        eventbus.on("sessionchanged", delayedUpdate);
        /*
        window.addEventListener("message", function(event) {
            var data = event.data;
            if(typeof data === "string" && data.indexOf("preview-scroll: ") === 0) {
                previewScrollY = +data.substring("preview-scroll: ".length);
                state.set("preview.scrollY", previewScrollY);
            }
        });*/
    };
    
    exports.init = function() {
        previewWrapperEl = $("<div class='preview-vsplit2-right'><iframe id='preview' src='preview.html'>").hide();
        $("body").append(previewWrapperEl);
        previewEl = $("#preview");
        /*previewEl.load(function() {
            previewEl[0].contentWindow.postMessage(previewScrollY, "*");
        });*/
    };
    
    command.define("Tools:Preview", {
        exec: function() {
            splitPreview();
        },
        readOnly: true
    });
});
