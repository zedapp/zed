/**
 * The project module exposes the same API as a file system module, but
 * picks an implementation based on the "url" argument passed to the editor URL
 */
/*global define, $, zed */
define(function(require, exports, module) {
    plugin.consumes = ["eventbus", "command", "windows", "window"];
    return plugin;

    function plugin(options, imports, register) {
        var opts = require("./lib/options");
        var command = imports.command;
        var eventbus = imports.eventbus;
        var windows = imports.windows;
        var win = imports.window;

        $("title").text(opts.get("title") + " [ Zed ]");

        command.define("Project:Open Project Picker", {
            doc: "Open the initial Zed window that allows you to switch between projects.",
            exec: function() {
                var w = windows.getOpenWindow();
                if(w) {
                    w.focus();
                } else {
                    win.create(window.isNodeWebkit ? "open.nw.html" : "open.chrome.html", "chrome", 400, 300);
                }
            },
            readOnly: true
        });

        command.define("Project:Rename", {
            doc: "Rename the current project on disk.",
            exec: function() {
                zed.getService("ui").prompt({
                    message: "Rename project to:",
                    input: opts.get('title')
                }).then(function(name) {
                    if (!name) {
                        // canceled
                        return;
                    }
                    opts.set("title", name);
                    zed.getService("history").renameProject(opts.get("url"), name);
                    eventbus.emit("projecttitlechanged");
                });
            },
            readOnly: true
        });

        register();
    }
});
