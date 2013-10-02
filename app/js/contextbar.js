/*global define, $ */
define(function(require, exports, module) {
    var eventbus = require("./lib/eventbus");
    var editor = require("./editor");
    var settings = require("./settings");
    var options = require("./lib/options");
    var command = require("./command");
    var icons = require("./lib/icons");
    
    var barEl;

    exports.hook = function() {
        eventbus.once("editorloaded", update);
        eventbus.on("settingschanged", update);
    };
    
    function update() {
        var showContextBar = settings.get("showContextBar");
        var fontSize = settings.get("fontSize");
        var barHeight = fontSize + 13;
        
        if(showContextBar && !barEl) {
            barEl = $("<div id='contextbar'>");
            var url = options.get('url');
            var friendlyUrl = url.indexOf("http") === 0 ? url : url.split(':')[1];
            
            barEl.html("<img src='" + icons.protocolIcon(url) + "'/>" + friendlyUrl + " &raquo;");
            $("body").append(barEl);
        } else if(!showContextBar && barEl) {
            barEl.remove();
            barEl = null;
        }
        
        if(showContextBar) {
            barEl.height(barHeight)
                 .css("font-size",   fontSize + "px")
                 .css("line-height", barHeight + "px")
                 .css("padding-left", (fontSize + 15) + "px");
            barEl.find("img").css("height", fontSize + "px")
                             .css("width",  fontSize + "px");
        }
        
        editor.getEditors(true).forEach(function(edit) {
            $(edit.container).css("top", showContextBar ? (barHeight+1) + "px": "0");
        });
    }
    
    command.define("Settings:Toggle Context Bar", {
        exec: function() {
            settings.set("showContextBar", !settings.get("showContextBar"));
        },
        readOnly: true
    });
});