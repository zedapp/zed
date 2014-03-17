/*global define, $, _, chrome */
define(function(require, exports, module) {
    var eventbus = require("./lib/eventbus");
    var editor = require("./editor");
    var config = require("./config");
    var options = require("./lib/options");
    var command = require("./command");

    var useragent = require("ace/lib/useragent");

    eventbus.declare("projecttitlechanged");
    eventbus.declare("sessionactivitystarted"); // session, name
    eventbus.declare("sessionactivitycompleted"); // session, name
    eventbus.declare("sessionactivityfailed"); // session, error

    var winButtons;
    if (useragent.isMac) {
        winButtons = "<div class='close'></div><div class='minimize'></div><div class='maximize'></div>";
    } else {
        winButtons = "<div class='minimize'></div><div class='maximize'></div><div class='close'></div>";
    }
    var barEl = $("<div id='titlebar'><div class='windowbuttons'>" + winButtons + "</div><div class='title'></div><div class='fullscreen'></div>");
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
                var clsToAdd = "pathbar-" + editorClasses[0].substring("editor-".length);
                // Remove old pathbar-* classes
                var pathBarEl = edit.pathBarEl;
                _.each(pathBarEl.attr("class").split(" "), function(cls) {
                    if (cls.indexOf("pathbar-") === 0) {
                        pathBarEl.removeClass(cls);
                    }
                });
                pathBarEl.addClass(clsToAdd);
            });
        });
        eventbus.on("switchsession", switchSession);

        eventbus.once("editorloaded", function() {
            editor.getEditors(true).forEach(function(edit) {
                var el = $("<div class='pathbar'><div class='path'>No file</div><div class='info' 'display: none;'></div>");
                barEl.append(el);
                el.find(".path").click(function() {
                    require(["./command"], function(command) {
                        command.exec("Navigate:Goto", edit, edit.session);
                    });
                });
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
        var barHeight = 46;

        var title = options.get('title');
        var titleEl = barEl.find(".title");
        var win = chrome.app.window.current();

        titleEl.html("<img src='img/zed-small.png'/>" + title + " ");

        // TODO: Rework this to toggle CSS styles
        var buttonsEl = barEl.find(".windowbuttons");
        if (useragent.isMac) {
            buttonsEl.mousemove(function() {
                buttonsEl.find("div").css("background-position-y", '-16px');
            });
            buttonsEl.mouseout(function() {
                buttonsEl.find("div").css("background-position-y", '0');
            });
            $(window).blur(function() {
                buttonsEl.find("div").css("background-position-y", '-31px');
            });
            $(window).focus(function() {
                buttonsEl.find("div").css("background-position-y", '0');
            });
        }
        buttonsEl.find(".close").click(function() {
            win.close();
        });
        buttonsEl.find(".minimize").click(function() {
            win.minimize();
        });
        buttonsEl.find(".maximize").click(function() {
            if (win.isMaximized()) {
                win.restore();
            } else {
                win.maximize();
            }
        });
        barEl.find(".fullscreen").click(function() {
            if (win.isFullscreen()) {
                win.restore();
            } else {
                win.fullscreen();
            }
        });

        editor.getEditors(true).forEach(function(edit) {
            $(edit.container).css("top", barHeight + "px");
            edit.resize();
        });
        $("#preview-wrapper").css("top", barHeight + "px");
    }

    function switchSession(edit, session) {
        var filename = session.filename || "No file";
        edit.pathBarEl.find('.path').text(filename + (session.readOnly ? " [Read Only]" : ""));
        edit.pathBarEl.find('.info').html("");
    }
});
