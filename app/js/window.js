/*global chrome, define*/
define(function(require, exports, module) {
    var command = require("./command");
    var win = chrome.app.window.current();

    command.define("Window:Close", {
        exec: function() {
            win.close();
        },
        readOnly: true
    });

    command.define("Window:Fullscreen", {
        exec: function() {
            if (win.isFullscreen()) {
                win.restore();
            } else {
                win.fullscreen();
            }
        },
        readOnly: true
    });

    command.define("Window:Maximize", {
        exec: function() {
            if (win.isMaximized()) {
                win.restore();
            } else {
                win.maximize();
            }
        },
        readOnly: true
    });

    command.define("Window:Minimize", {
        exec: function() {
            win.minimize();
        },
        readOnly: true
    });
});
