/*global chrome, define*/
define(function(require, exports, module) {
    plugin.consumes = ["window", "command"];
    return plugin;

    function plugin(options, imports, register) {
        var command = imports.command;
        var win = imports.window;

        command.define("Window:Close", {
            doc: "Closes the current window.",
            exec: function() {
                win.close();
            },
            readOnly: true
        });

        command.define("Window:Fullscreen", {
            doc: "Toggles between windowed and fullscreen for the current window.",
            exec: function() {
                win.fullScreen();
            },
            readOnly: true
        });

        command.define("Window:Maximize", {
            doc: "Toggles between windowed and maximized for the current window.",
            exec: function() {
                win.maximize();
            },
            readOnly: true
        });

        command.define("Window:Minimize", {
            doc: "Minimizes the current window.",
            exec: function() {
                win.minimize();
            },
            readOnly: true
        });

        command.define("Window:New", {
            doc: "Opens a new Zed window.",
            exec: function() {
                win.create("editor.html?url=&title=Zed", "none", 800, 600);
            },
            readOnly: true
        })

        register();
    }
});
