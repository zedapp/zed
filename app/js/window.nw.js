/*global chrome, define, nodeRequire*/
define(function(require, exports, module) {
    plugin.consumes = ["command", "background"];
    plugin.provides = ["window"];
    return plugin;

    function plugin(options, imports, register) {
        var gui = nodeRequire("nw.gui");
        var opts = require("./lib/options");

        var command = imports.command;
        var background = imports.background;

        var win = gui.Window.get();

        background.registerWindow(opts.get("title"), opts.get("url"), win);

        var closeHandler = null;

        var isMaximized = false;

        var api = {
            close: function(force) {
                if(force) {
                    win.close(true);
                } else {
                    closeHandler();
                }
            },
            setCloseHandler: function(handler) {
                closeHandler = handler;
                win.on("close", handler);
            },
            useNativeFrame: function() {
                return true;
            },
            fullScreen: function() {
                if (win.isFullscreen) {
                    win.leaveFullscreen();
                } else {
                    win.enterFullscreen();
                }
            },
            maximize: function() {
                win.maximize();
            },
            minimize: function() {
                win.minimize();
            },
            getBounds: function() {
                return {
                    width: win.width,
                    height: win.height,
                    top: win.y,
                    left: win.x,
                    isMaximized: isMaximized
                };
            },
            setBounds: function(bounds) {
                win.x = bounds.left;
                win.width = bounds.width;

                // hack to get restoring window position and size to work in
                // linux
                setTimeout(function() {
                    win.y = bounds.top;
                    win.height = bounds.height;
                }, 10);

                if(bounds.isMaximized) {
                    win.maximize();
                }

                setTimeout(function() {
                    if(win.width < 300) {
                        win.width = 300;
                    }
                    if(win.height < 300) {
                        win.height = 300;
                    }
                }, 1000);
            },
            addResizeListener: function(listener) {
                win.on("resize", function() {
                    isMaximized = false;
                    listener();
                });
                win.on("move", function() {
                    isMaximized = false;
                    listener();
                });
                win.on("maximize", function() {
                    // Give other events time to trigger (resize, move), then override
                    setTimeout(function() {
                        isMaximized = true;
                        listener();
                    }, 1000);
                });
            },
            focus: function() {
                win.focus();
            }
        };

        command.define("Development:Reload window", {
            doc: "Reload the current window.",
            exec: function() {
                win.reload();
            },
            readOnly: true
        });

        command.define("Development:Show DevTools", {
            doc: "Show the node-webkit developer tools.",
            exec: function() {
                win.showDevTools();
            },
            readOnly: true
        });

        register(null, {
            window: api
        });
    }
});
