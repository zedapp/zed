/*global chrome, define*/
define(function(require, exports, module) {
    plugin.provides = ["window"];
    return plugin;

    function plugin(options, imports, register) {
        var win = chrome.app.window.current();

        var closeHandler = null;

        var api = {
            close: function(force) {
                if(force || !closeHandler) {
                    win.close();
                } else {
                    closeHandler();
                }
            },
            setCloseHandler: function(handler) {
                closeHandler = handler;
            },
            create: function(url, frameStyle, width, height, callback) {
                chrome.app.window.create(url, {
                    frame: frameStyle,
                    width: width,
                    height: height,
                }, function(win) {
                    callback && callback(null, {
                        addCloseListener: function(listener) {
                            win.onClosed.addListener(listener);
                        },
                        window: win.contentWindow,
                        focus: function() {
                            win.focus();
                        }
                    });
                });
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
            },
            getBounds: function() {
                return win.getBounds();
            },
            setBounds: function(bounds) {
                win.setBounds(bounds);
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
