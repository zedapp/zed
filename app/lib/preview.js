define(function(require, exports, module) {
    var resetEditorDiv = require("./split").resetEditorDiv;
    var state = require("./state");
    var editor = require("./editor");
    var command = require("./command");
    var eventbus = require("./eventbus");
    var project = require("./project");
    var session_manager = require("./session_manager");
    
    var previewWrapperEl;
    var previewEl;
    var previewSession;
    var previewScrollY = 0;
    
    var trackScrollHtml = "<script>onmessage = function(msg) { " +
                          "    scrollTo(0, msg.data);" +
                          "};" + 
                          "window.onscroll = function() {" + 
                          "   parent.postMessage('preview-scroll: ' + pageYOffset, '*');" +
                          "};" +
                          "</script>";
    
    var modePreviewMapping = {
        "ace/mode/html": function(session, callback) {
            var code = session.getValue();
            callback(null, "data:text/html;charset=utf-8," + escape(code + trackScrollHtml));
        },
        "ace/mode/markdown": function(session, callback) {
            var code = session.getValue();
            require(["util/showdown"], function() {
                var converter = new Showdown.converter();
                var html = converter.makeHtml(code);
                callback(null, "data:text/html;charset=utf-8," + escape(html + trackScrollHtml));
            });
        },
        "default": function(session, callback) {
            callback(null, "data:text/html;charset=utf-8," + escape("No preview available"));
        }
    };
    
    function update() {
        if(!previewSession) {
            return;
        }
        var fn = modePreviewMapping[previewSession.getMode().$id] || modePreviewMapping.default;
        fn(previewSession, function(err, url) {
            previewEl.attr("src", url);
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
            }
        });
        var previewTimer = null;
        eventbus.on("sessionchanged", function(session) {
            if(previewTimer)
                clearTimeout(previewTimer);
            previewTimer = setTimeout(update, 500);
        });
        window.addEventListener("message", function(event) {
            var data = event.data;
            if(data.indexOf("preview-scroll: ") === 0) {
                previewScrollY = +data.substring("preview-scroll: ".length);
                state.set("preview.scrollY", previewScrollY);
            }
        });
    };
    
    exports.init = function() {
        previewWrapperEl = $("<div class='preview-vsplit2-right'><iframe id='preview'>").hide();
        $("body").append(previewWrapperEl);
        previewEl = $("#preview");
        previewEl.load(function() {
            previewEl[0].contentWindow.postMessage(previewScrollY, "*");
        });
    };
    
    command.define("Split:Preview", {
        exec: function() {
            splitPreview();
        },
        readOnly: true
    });
});