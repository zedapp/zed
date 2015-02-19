/*global define, $, _, chrome */
define(function(require, exports, module) {
    plugin.consumes = ["eventbus", "editor", "command", "window"];
    plugin.provides = ["title_bar"];
    return plugin;

    function plugin(options, imports, register) {
        var useragent = require("ace/lib/useragent");
        var opts = require("./lib/options");

        var eventbus = imports.eventbus;
        var editor = imports.editor;
        var command = imports.command;
        var window = imports.window;

        eventbus.declare("projecttitlechanged");
        eventbus.declare("sessionactivitystarted"); // session, name
        eventbus.declare("sessionactivitycompleted"); // session, name
        eventbus.declare("sessionactivityfailed"); // session, error

        var winButtons;
        var barEl, pathBarEl;

        var api = {
            hook: function() {
                if (!window.useNativeFrame()) {
                    if (useragent.isMac) {
                        winButtons = "<div class='close'></div><div class='minimize'></div><div class='maximize'></div>";
                    } else {
                        winButtons = "<div class='minimize'></div><div class='maximize'></div><div class='close'></div>";
                    }
                    barEl = $("<div id='titlebar'><div class='windowbuttons'>" + winButtons + "</div><div class='title'></div><div class='fullscreen'></div>");
                    $("body").append(barEl);

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
                        window.close();
                    });
                    buttonsEl.find(".minimize").click(function() {
                        window.minimize();
                    });
                    buttonsEl.find(".maximize").click(function() {
                        window.maximize();
                    });
                    barEl.find(".fullscreen").click(function() {
                        window.fullScreen();
                    });
                }

                pathBarEl = $("<div id='pathbar-wrapper'>");
                $("#editor-wrapper").append(pathBarEl);
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
                    update();
                    editor.getEditors(true).forEach(function(edit) {
                        var el = $("<div class='pathbar'><div class='path'>No file</div><div class='info' 'display: none;'></div>");
                        pathBarEl.append(el);
                        el.find(".path").click(function() {
                            editor.setActiveEditor(edit);
                            eventbus.emit("splitswitched", edit);
                            setTimeout(function() {
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
                            infoEl.show();
                        }
                    });
                });
                eventbus.on("sessionactivitycompleted", function(session) {
                    editor.getEditors().forEach(function(edit) {
                        if (edit.getSession() === session) {
                            var infoEl = edit.pathBarEl.find(".info");
                            infoEl.hide();
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
                                infoEl.hide();
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
            }
        };

        function update() {
            var title = opts.get('title');
            if (barEl) {
                var titleEl = barEl.find(".title");

                titleEl.html("<img src='img/zed-small.png'/>" + title + " ");
            } else {
                $("title").text(title);
            }
            // var config = zed.getService("config");
            // pathBarEl.css("height", (config.getPreference("fontSize") + 7) + "px");
            // editor.getEditors(true).forEach(function(edit) {
            //     if (!edit.pathBarEl) {
            //         // Bit too early
            //         return;
            //     }
            //     pathBarEl.find("div").css("font-size", config.getPreference("fontSize") + "px");
            // });
        }

        function switchSession(edit, session) {
            var filename = session.filename || "No file";
            edit.pathBarEl.find('.path').text(filename + (session.readOnly ? " [Read Only]" : ""));
            edit.pathBarEl.find('.info').html("");
        }

        register(null, {
            title_bar: api
        });
    }

});
