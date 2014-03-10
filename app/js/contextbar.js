/*global define, $ */
define(function(require, exports, module) {
    var eventbus = require("./lib/eventbus");
    var editor = require("./editor");
    var config = require("./config");
    var options = require("./lib/options");
    var command = require("./command");
    var icons = require("./lib/icons");

    var barEl;
    
    eventbus.declare("projecttitlechanged");

    exports.hook = function() {
        eventbus.once("editorloaded", update);
        eventbus.once("ioavailable", update);
        eventbus.on("configchanged", update);
        eventbus.on("projecttitlechanged", update);
    };

    function update() {
        var showContextBar = config.getPreference("showContextBar");
        var barHeight = 30;

        if(showContextBar && !barEl) {
            barEl = $("<div id='contextbar'><div class='windowbuttons'></div><div class='title'></div><div class='fullscreen'></div>");
            $("body").append(barEl);
        } else if(!showContextBar && barEl) {
            barEl.remove();
            barEl = null;
        }

        if(showContextBar) {
            var title = options.get('title');
            var titleEl = barEl.find(".title");

            titleEl.html("<img src='img/zed-small.png'/>" + title + " &raquo;");
            
            var buttonsEl = barEl.find(".windowbuttons");
            buttonsEl.mousemove(function() {
                buttonsEl.css("background-position-y", '-16px');
            });
            buttonsEl.mouseout(function() {
                buttonsEl.css("background-position-y", '0');
            });
            buttonsEl.click(function(evt) {
                var x = evt.clientX - 7;
                var win = chrome.app.window.current();
                if(x >= 0 && x <= 17) {
                    // close
                    win.close();
                } else if(x > 17 && x <= 37) {
                    // minimize
                    win.minimize();
                } else {
                    // maximize
                    if(win.isMaximized()) {
                        win.restore();
                    } else {
                        win.maximize();
                    }
                }
            });
            
        }

        editor.getEditors(true).forEach(function(edit) {
            $(edit.container).css("top", showContextBar ? (barHeight+1) + "px": "0");
            edit.resize();
        });
        $("#preview-wrapper").css("top", showContextBar ? (barHeight+1) + "px": "0");
    }

    command.define("Configuration:Preferences:Toggle Context Bar", {
        exec: function() {
            config.setPreference("showContextBar", !config.getPreference("showContextBar"));
        },
        readOnly: true
    });
});