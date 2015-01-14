/*global chrome, define*/
define(function(require, exports, module) {
    plugin.consumes = ["eventbus", "background"];
    plugin.provides = ["window"];
    return plugin;

    function plugin(options, imports, register) {
        var win = chrome.app.window.current();

        var userAgent = require("ace/lib/useragent");
        var opts = require("./lib/options");

        var eventbus = imports.eventbus;
        var background = imports.background;

        eventbus.declare("windowclose");

        var closeHandler = null;

        background.registerWindow(opts.get("title"), opts.get("url"), win);

        var api = {
            close: function(force) {
                if(force || !closeHandler) {
                    win.close();
                } else {
                    eventbus.emit("windowclose");
                    closeHandler();
                }
            },
            setCloseHandler: function(handler) {
                closeHandler = handler;
            },
            useNativeFrame: function() {
                return userAgent.isLinux;
                // return false;
            },
            // create: function(url, width, height) {
            //     width = width || 800;
            //     height = height || 600;
            //     return new Promise(function(resolve) {
            //         chrome.app.window.create(url, {
            //             frame: api.useNativeFrame() ? "chrome" : "none",
            //             width: width,
            //             height: height,
            //         }, function(win) {
            //             resolve({
            //                 addCloseListener: function(listener) {
            //                     win.onClosed.addListener(listener);
            //                 },
            //                 window: win.contentWindow,
            //                 focus: function() {
            //                     win.focus();
            //                 }
            //             });
            //         });
            //     });
            // },
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
            },
            getBounds: function() {
                var bounds = win.getBounds();
                return {
                    width: bounds.width,
                    height: bounds.height,
                    top: bounds.top,
                    left: bounds.left,
                    isMaximized: win.isMaximized()
                };
            },
            setBounds: function(bounds) {
                if(bounds.isMaximized) {
                    win.maximize();
                } else {
                    bounds.width = Math.max(400, bounds.width);
                    bounds.height = Math.max(400, bounds.height);
                    delete bounds.isMaximized;
                    win.setBounds(bounds);
                }
            },
            addResizeListener: function(listener) {
                win.onBoundsChanged.addListener(listener);
            },
            focus: function() {
                chrome.app.window.current().focus();
            }
        };

        register(null, {
            window: api
        });
    }
});
