/*global chrome, define*/
define(function(require, exports, module) {
    plugin.consumes = ["window", "command", "ui", "background"];
    return plugin;

    function plugin(options, imports, register) {
        var command = imports.command;
        var win = imports.window;
        var ui = imports.ui;
        var background = imports.background;

        var opts = require("./lib/options");

        command.define("Window:Close", {
            doc: "Closes the current window.",
            exec: function() {
                win.close();
            },
            readOnly: true
        });

        command.define("Zed:Quit", {
            doc: "Closes all Zed windows.",
            exec: function() {
                background.closeAllWindows();
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
                background.openProject("", "");
            },
            readOnly: true
        });

        command.define("Window:List", {
            exec: function() {
                var wins = background.getOpenWindows();
                ui.filterBox({
                    placeholder: "Filter window list",
                    text: "",
                    filter: function(phrase) {
                        var lcPhrase = phrase.toLowerCase();
                        return Promise.resolve(wins.filter(function(win) {
                            if(win.url === opts.get("url")) {
                                return false;
                            }
                            return win.title.toLowerCase().indexOf(lcPhrase) !== -1;
                        }).map(function(win) {
                            return {
                                name: win.title,
                                path: win.url,
                                icon: "action"
                            };
                        }));
                    },
                    hint: function() {
                        return "Press <tt>Enter</tt> to switch to the selected window.";
                    },
                    onSelect: function(url) {
                        background.openProject(null, url);
                    }
                });
            },
            readOnly: true
        });

        register();
    }
});
