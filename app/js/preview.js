/**
 * Implements the preview split mode
 */
// TODO: Redo all of this, it's messy and buggy
/*global define, $, _ */
define(function(require, exports, module) {
    plugin.consumes = ["split", "state", "editor", "command", "eventbus"];
    plugin.provides = ["preview"];
    return plugin;

    function plugin(options, imports, register) {
        var resetEditorDiv = imports.split.resetEditorDiv;
        var switchSplit = imports.split.switchSplit;
        var state = imports.state;
        var editor = imports.editor;
        var command = imports.command;
        var eventbus = imports.eventbus;

        var previewWrapperEl;
        var previewEl;
        var previewScrollY = 0;

        eventbus.declare("preview");

        var api = {
            hook: function() {
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
            },
            init: function() {
                var data = "data:text/html," + require("text!../preview.html");
                if(window.isNodeWebkit) {
                    previewWrapperEl = $("<div id='preview-wrapper' class='preview-vsplit2-right'><iframe id='preview'>").hide();
                } else {
                    previewWrapperEl = $("<div id='preview-wrapper' class='preview-vsplit2-right'><webview nwdisable nwfaketop id='preview'>").hide();
                }
                $("body").append(previewWrapperEl);
                previewEl = $("#preview");
                previewEl.attr("src", data);
            },
            showPreview: function(html) {
                previewEl[0].contentWindow.postMessage({
                    content: html
                }, "*");
            },
        };

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

        /* throttles calls to f so that each call will happen no sooner than   /
        /  factor times the time the last call took to execute. Only one call  /
        /  may be queued, old unexecuted calls are discarded.                 */
        function adaptiveThrottle(f, factor){
            var next_t, toFire, timedFunction;
            if (factor === undefined) factor = 2;
            next_t = 0;
            
            timedFunction = function(){
                var t_, a_;
                t_  = this; a_ = arguments;

                return function(){
                   var t, dt;
                   t = Date.now();
                   f.apply(t_, a_);
                   dt = Date.now() - t;
                   next_t = Date.now() + factor * dt;      
                }
            }
            return function(){
               clearTimeout(toFire);
               toFire  = setTimeout(timedFunction.apply(this, arguments), (next_t - Date.now()))
            } 
        }

        var delayedUpdate = adaptiveThrottle(update, 4);

        setInterval(delayedUpdate,2000);

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
            if (editors[0] !== activeEditor) {
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



        command.define("Split:Preview", {
            doc: "Open a split pane with a preview of the current document.",
            exec: function() {
                splitPreview();
            },
            readOnly: true
        });

        return register(null, {
            preview: api
        });
    }
});
