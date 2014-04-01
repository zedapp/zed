/*global chrome, define*/
define(function(require, exports, module) {
    plugin.consumes = ["command"];
    plugin.provides = ["window"];
    return plugin;

    function plugin(options, imports, register) {
        var command = imports.command;

        var win = chrome.app.window.current();

        var api = {
            close: function() {
                win.close();
            },
            fullScreen: function() {
                if (win.isFullscreen()) {
                    win.restore();
                } else {
                    win.fullscreen();
                }
            },
            maximize: function() {
                if (win.isMaximized()) {
                    win.restore();
                } else {
                    win.maximize();
                }
            },
            minimize: function() {
                win.minimize();
            }
        };

        command.define("Window:Close", {
            exec: function() {
                api.close();
            },
            readOnly: true
        });

        command.define("Window:Fullscreen", {
            exec: function() {
                api.fullScreen();
            },
            readOnly: true
        });

        command.define("Window:Maximize", {
            exec: function() {
                api.maximize();
            },
            readOnly: true
        });

        command.define("Window:Minimize", {
            exec: function() {
                api.minimize();
            },
            readOnly: true
        });

        register(null, {
            window: api
        });
    }
});
