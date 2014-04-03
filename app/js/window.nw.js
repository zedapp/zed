/*global chrome, define, nodeRequire*/
define(function(require, exports, module) {
    plugin.provides = ["window"];
    return plugin;

    function plugin(options, imports, register) {
        var gui = nodeRequire("nw.gui");

        var win = gui.Window.get();

        var api = {
            close: function() {
                win.close();
            },
            create: function(url, frameStyle, width, height, callback) {
                // chrome.app.window.create(url, {
                //     frame: frameStyle,
                //     width: width,
                //     height: height,
                // }, function(win) {
                //     callback && callback(null, {
                //         addCloseListener: function(listener) {
                //             win.onClosed.addListener(listener);
                //         },
                //         window: win.contentWindow,
                //         focus: function() { }
                //     });
                // });
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
            },
            addResizeListener: function(listener) {
                win.on("resize", function() {
                    listener();
                });
            },
            focus: function() {

            }
        };

        register(null, {
            window: api
        });
    }
});
