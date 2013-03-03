define(function(require, exports, module) {
    var eventbus = require("eventbus");
    var editor = require("editor");
    
    eventbus.on("splitchange", update);
    eventbus.on("switchsession", switchSession);
    
    init();
    
    function init() {
        editor.getEditors().forEach(function(edit, idx) {
            $(edit.container).css("bottom", "25px");
            $("body").append("<div id='editbar" + idx + "' class='editbar'><div class='path'></div><div class='info'>test</div>");
            edit.editbarEl = $("#editbar" + idx);
            
            var info = edit.editbarEl.find(".info");
            edit.on("changeSelection", function() {
                var range = edit.getSelection().getRange().start;
                info.text("[" + (range.row+1) + "," + (range.column+1) + "]");
            });
        });
    }
    
    function update(splits) {
        editor.getEditors().forEach(function(edit, idx) {
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
    
    function switchSession(edit, session) {
        edit.editbarEl.find('.path').text(session.filename);
    }
});