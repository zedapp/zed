/*global chrome, define, nodeRequire*/
define(function(require, exports, module) {
    plugin.consumes = ["command"];
    plugin.provides = ["window"];
    return plugin;

    function plugin(options, imports, register) {
        var gui = nodeRequire("nw.gui");

        var command = imports.command;

        var win = gui.Window.get();

        var closeHandler = null;

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
            create: function(url, frameStyle, width, height) {
                var frame = true;
                if (frameStyle == "none") {
                    frame = false;
                }
                var w = gui.Window.open(url, {
                    position: 'center',
                    width: width,
                    height: height,
                    frame: frame,
                    toolbar: false,
                    icon: "Icon.png"
                });
                return new Promise(function(resolve) {
                    w.once("loaded", function() {
                        w.focus();
                        resolve({
                            addCloseListener: function(listener) {
                                w.on("closed", function() {
                                    listener();
                                });
                            },
                            window: w.window,
                            focus: function() {
                                w.focus();
                            }
                        });
                    });
                });
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
                    left: win.x
                };
            },
            setBounds: function(bounds) {
                win.width = bounds.width;
                win.height = bounds.height;
                win.y = bounds.top;
                win.x = bounds.left;
            },
            addResizeListener: function(listener) {
                win.on("resize", function() {
                    listener();
                });
                win.on("move", function() {
                    listener();
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
