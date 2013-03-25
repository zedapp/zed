/*global define $ */
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
    
    function splitPreview(path) {
        state.set("split", "preview");
        resetEditorDiv($("#editor0")).addClass("editor-vsplit2-left");
        resetEditorDiv($("#editor1")).addClass("editor-disabled");
        resetEditorDiv($("#editor2")).addClass("editor-disabled");
        previewWrapperEl.show();
        if(path) {
            previewSession = session_manager.getSessions()[path];
        } else {
            previewSession = editor.getActiveSession();
        }
        update();
        state.set('preview.path', previewSession.filename);
        
        editor.getEditors().forEach(function(editor) {
            editor.resize();
        });
        eventbus.emit("splitchange", "preview");
    }
    
    exports.hook = function() {
        eventbus.on("allsessionsloaded", function() {
            previewScrollY = state.get("preview.scrollY") || 0;
            if(state.get("split") === "preview") {
                splitPreview(state.get('preview.path'));
            }
        });
        eventbus.on("splitchange", function(type) {
            if(type !== "preview") {
                previewWrapperEl.hide();
                previewSession = null;
            }
        });
        var previewTimer = null;
        eventbus.on("sessionchanged", function() {
            if(previewTimer)
                clearTimeout(previewTimer);
            previewTimer = setTimeout(update, 500);
        });
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
