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
        var fontSize = config.getPreference("fontSize");
        var fontFamily = config.getPreference("fontFamily");
        var barHeight = fontSize + 13;

        if(showContextBar && !barEl) {
            barEl = $("<div id='contextbar'>");
            $("body").append(barEl);
        } else if(!showContextBar && barEl) {
            barEl.remove();
            barEl = null;
        }

        if(showContextBar) {
            var url = options.get('url');
            var title = options.get('title');

            barEl.html("<img src='" + icons.protocolIcon(url) + "'/>" + title + " &raquo;");

            barEl.height(barHeight)
                 .css("font-size",   fontSize + "px")
                 .css("padding-left", (fontSize + 15) + "px")
                 .css("font-family", fontFamily);
            barEl.find("img").css("height", fontSize + "px")
                             .css("width",  fontSize + "px");
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