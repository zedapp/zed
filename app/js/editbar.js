/*global define, $ */
define(function(require, exports, module) {
    var eventbus = require("./lib/eventbus");
    var editor = require("./editor");

    eventbus.declare("sessionactivitystarted"); // session, name
    eventbus.declare("sessionactivitycompleted"); // session, name
    eventbus.declare("sessionactivityfailed"); // session, error

    exports.hook = function() {
        eventbus.on("splitchange", update);
        eventbus.on("switchsession", switchSession);

        eventbus.once("editorloaded", function() {
            editor.getEditors(true).forEach(function(edit, idx) {
                $(edit.container).css("bottom", "25px");
                $("body").append("<div id='editbar" + idx + "' class='editbar'><div class='path'></div><div class='info' 'display: none;'></div>");
                edit.editbarEl = $("#editbar" + idx);
            });
        });

        eventbus.on("sessionactivitystarted", function(session, description) {
            editor.getEditors().forEach(function(edit) {
                if(edit.getSession() === session) {
                    var infoEl = edit.editbarEl.find(".info");
                    infoEl.html(description);
                    infoEl.fadeIn();
                }
            });
        });
        eventbus.on("sessionactivitycompleted", function(session) {
            editor.getEditors().forEach(function(edit) {
                if(edit.getSession() === session) {
                    var infoEl = edit.editbarEl.find(".info");
                    infoEl.fadeOut();
                }
            });
        });
        eventbus.on("sessionactivityfailed", function(session, error) {
            editor.getEditors().forEach(function(edit) {
                if(edit.getSession() === session) {
                    var infoEl = edit.editbarEl.find(".info");
                    infoEl.fadeIn();
                    infoEl.html('<span class="error">' + error + '</span>');
                    setTimeout(function() {
                        infoEl.fadeOut();
                    }, 3000);
                }
            });
        });
        eventbus.on("splitswitched", function(activeEdit) {
            editor.getEditors(true).forEach(function(edit) {
                if(!edit.editbarEl) {
                    // Bit too early
                    return;
                }
                if(edit !== activeEdit) {
                    edit.editbarEl.removeClass("active");
                } else {
                    edit.editbarEl.addClass("active");
                }
            });
        });
        eventbus.on("settingschanged", function(settings) {
            var fontSize = settings.get("fontSize");
            editor.getEditors(true).forEach(function(edit) {
                var editBarHeight = fontSize + 13;
                edit.editbarEl.height(editBarHeight);
                edit.editbarEl.find(".path").css("font-size", fontSize + "px")
                                            .css("line-height", (editBarHeight - 2) + "px");
                edit.editbarEl.find(".info").css("font-size", (fontSize-3) + "px")
                                            .css("line-height", (editBarHeight - 2) + "px");
                $(edit.container).css("bottom",  (editBarHeight+2) + "px");
            });
        });
    };

    function update() {
        editor.getEditors(true).forEach(function(edit) {
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
        edit.editbarEl.find('.info').html("");
    }
});