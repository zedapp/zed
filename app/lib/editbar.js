define(function(require, exports, module) {
    var eventbus = require("eventbus");
    var editor = require("editor");
    var keys = require("keys");
    var sandboxEval = require("commandline").sandboxEval;
    var state = null; // delayed: require("state");
    
    exports.hook = function() {
        eventbus.on("splitchange", update);
        eventbus.on("switchsession", switchSession);
        
        eventbus.once("editorloaded", function() {
            editor.getEditors(true).forEach(function(edit, idx) {
                $(edit.container).css("bottom", "25px");
                $("body").append("<div id='editbar" + idx + "' class='editbar'><div class='path'></div><div class='info'>test</div>");
                edit.editbarEl = $("#editbar" + idx);
                
                var info = edit.editbarEl.find(".info");
                edit.on("changeSelection", function() {
                    var range = edit.getSelection().getRange().start;
                    info.text("[" + (range.row+1) + "," + (range.column+1) + "]");
                });
            });
        });
    };
    
    function update() {
        editor.getEditors(true).forEach(function(edit, idx) {
            var el = $(edit.container);
            var barEl = edit.editbarEl;
            if(el.is(':visible')) {
                barEl.removeClass("hidden");
                barEl.css("left", el.offset().left + "px");
                barEl.css("width", el.width() + "px");
            } else {
                barEl.addClass("hidden");
            }
        });
    }
    
    $(window).resize(update);
    
    function switchSession(edit, session) {
        var filename = session.filename;
        edit.editbarEl.find('.path').text(filename);
    }
});
