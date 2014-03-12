/*global define, $, _ */
define(function(require, exports, module) {
    var eventbus = require("./lib/eventbus");
    var editor = require("./editor");
    var config = require("./config");
    var options = require("./lib/options");
    var command = require("./command");

    eventbus.declare("projecttitlechanged");
    eventbus.declare("sessionactivitystarted"); // session, name
    eventbus.declare("sessionactivitycompleted"); // session, name
    eventbus.declare("sessionactivityfailed"); // session, error

    var barEl = $("<div id='contextbar'><div class='windowbuttons'><div class='close'></div><div class='minimize'></div><div class='maximize'></div></div><div class='title'></div><div class='fullscreen'></div>");
    $("body").append(barEl);


    exports.hook = function() {
        eventbus.once("editorloaded", update);
        eventbus.once("ioavailable", update);
        eventbus.on("configchanged", update);
        eventbus.on("projecttitlechanged", update);

        // Editbar stuff
        eventbus.on("splitchange", function() {
            editor.getEditors(true).forEach(function(edit) {
                if (!edit.pathBarEl) {
                    // Bit too early
                    return;
                }
                var editorClasses = _.filter(edit.container.getAttribute("class").split(" "), function(cls) {
                    return cls.indexOf("editor-") === 0;
                });
                var clsToAdd = "editbar-" + editorClasses[0].substring("editor-".length);
                // Remove old editbar-* classes
                var pathBarEl = edit.pathBarEl;
                _.each(pathBarEl.attr("class").split(" "), function(cls) {
                    if (cls.indexOf("editbar-") === 0) {
                        pathBarEl.removeClass(cls);
                    }
                });
                pathBarEl.addClass(clsToAdd);
            });
        });
        eventbus.on("switchsession", switchSession);

        eventbus.once("editorloaded", function() {
            editor.getEditors(true).forEach(function(edit) {
                var el = $("<div class='editbar'><div class='path'></div><div class='info' 'display: none;'></div>");
                barEl.append(el);
                edit.pathBarEl = el;
            });
        });

        eventbus.on("sessionactivitystarted", function(session, description) {
            editor.getEditors().forEach(function(edit) {
                if (edit.getSession() === session) {
                    var infoEl = edit.pathBarEl.find(".info");
                    infoEl.html(description);
                    infoEl.fadeIn();
                }
            });
        });
        eventbus.on("sessionactivitycompleted", function(session) {
            editor.getEditors().forEach(function(edit) {
                if (edit.getSession() === session) {
                    var infoEl = edit.pathBarEl.find(".info");
                    infoEl.fadeOut();
                }
            });
        });
        eventbus.on("sessionactivityfailed", function(session, error) {
            editor.getEditors().forEach(function(edit) {
                if (edit.getSession() === session) {
                    var infoEl = edit.pathBarEl.find(".info");
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
                if (!edit.pathBarEl) {
                    // Bit too early
                    return;
                }
                if (edit !== activeEdit) {
                    edit.pathBarEl.removeClass("active");
                } else {
                    edit.pathBarEl.addClass("active");
                }
            });
        });
    };

    function update() {
        var showContextBar = config.getPreference("showContextBar");
        var barHeight = 46;

        var title = options.get('title');
        var titleEl = barEl.find(".title");
        var win = chrome.app.window.current();

        titleEl.text(title);

        var buttonsEl = barEl.find(".windowbuttons");
        buttonsEl.mousemove(function() {
            buttonsEl.find("div").css("background-position-y", '-16px');
        });
        buttonsEl.mouseout(function() {
            buttonsEl.find("div").css("background-position-y", '0');
        });
        buttonsEl.find(".close").mouseup(function() {
            win.close();
        });
        buttonsEl.find(".minimize").mouseup(function() {
            win.minimize();
        });
        buttonsEl.find(".maximize").mouseup(function() {
            if (win.isMaximized()) {
                win.restore();
            } else {
                win.maximize();
            }
        });

        editor.getEditors(true).forEach(function(edit) {
            $(edit.container).css("top", barHeight + "px");
            edit.resize();
        });
        $("#preview-wrapper").css("top", barHeight + "px");
    }
    
    function switchSession(edit, session) {
        var filename = session.filename;
        edit.pathBarEl.find('.path').text(filename + (session.readOnly ? " [Read Only]" : ""));
        edit.pathBarEl.find('.info').html("");
    }

    command.define("Configuration:Preferences:Toggle Context Bar", {
        exec: function() {
            config.setPreference("showContextBar", !config.getPreference("showContextBar"));
        },
        readOnly: true
    });
});