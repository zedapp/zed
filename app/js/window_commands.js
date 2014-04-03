/*global chrome, define*/
define(function(require, exports, module) {
    plugin.consumes = ["window", "command"];
    return plugin;

    function plugin(options, imports, register) {
        var command = imports.command;
        var win = imports.window;

        command.define("Window:Close", {
            exec: function() {
                win.close();
            },
            readOnly: true
        });

        command.define("Window:Fullscreen", {
            exec: function() {
                win.fullScreen();
            },
            readOnly: true
        });

        command.define("Window:Maximize", {
            exec: function() {
                win.maximize();
            },
            readOnly: true
        });

        command.define("Window:Minimize", {
            exec: function() {
                win.minimize();
            },
            readOnly: true
        });

        register();
    }
});
