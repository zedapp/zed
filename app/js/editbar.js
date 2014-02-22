/*global define, $, _ */
define(function(require, exports, module) {
    var eventbus = require("./lib/eventbus");
    var editor = require("./editor");

    eventbus.declare("sessionactivitystarted"); // session, name
    eventbus.declare("sessionactivitycompleted"); // session, name
    eventbus.declare("sessionactivityfailed"); // session, error

    exports.hook = function() {

        eventbus.on("splitchange", function() {
            editor.getEditors(true).forEach(function(edit) {
                if (!edit.editbarEl) {
                    // Bit too early
                    return;
                }
                var editorClasses = _.filter(edit.container.getAttribute("class").split(" "), function(cls) {
                    return cls.indexOf("editor-") === 0;
                });
                var clsToAdd = "editbar-" + editorClasses[0].substring("editor-".length);
                // Remove old editbar-* classes
                var editbarEl = edit.editbarEl;
                _.each(editbarEl.attr("class").split(" "), function(cls) {
                    if (cls.indexOf("editbar-") === 0) {
                        editbarEl.removeClass(cls);
                    }
                });
                editbarEl.addClass(clsToAdd);
            });
        });
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
                if (edit.getSession() === session) {
                    var infoEl = edit.editbarEl.find(".info");
                    infoEl.html(description);
                    infoEl.fadeIn();
                }
            });
        });
        eventbus.on("sessionactivitycompleted", function(session) {
            editor.getEditors().forEach(function(edit) {
                if (edit.getSession() === session) {
                    var infoEl = edit.editbarEl.find(".info");
                    infoEl.fadeOut();
                }
            });
        });
        eventbus.on("sessionactivityfailed", function(session, error) {
            editor.getEditors().forEach(function(edit) {
                if (edit.getSession() === session) {
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
                if (!edit.editbarEl) {
                    // Bit too early
                    return;
                }
                if (edit !== activeEdit) {
                    edit.editbarEl.removeClass("active");
                } else {
                    edit.editbarEl.addClass("active");
                }
            });
        });
        eventbus.on("configchanged", function(config) {
            var fontSize = config.getPreference("fontSize");
            var fontFamily = config.getPreference("fontFamily");
            editor.getEditors(true).forEach(function(edit) {
                var pathEl = edit.editbarEl.find(".path");
                pathEl.css("font-size", fontSize + "px")
                      .css("font-family", fontFamily);
                edit.editbarEl.find(".info").css("font-size", (fontSize - 3) + "px")
                                            .css("font-family", fontFamily);
                setTimeout(function() {
                    $(edit.container).css("bottom", (pathEl.outerHeight(true) + 13) + "px");

                });
            });
        });
    };

    function switchSession(edit, session) {
        var filename = session.filename;
        edit.editbarEl.find('.path').text(filename + (session.readOnly ? " [Read Only]" : ""));
        edit.editbarEl.find('.info').html("");
    }
});