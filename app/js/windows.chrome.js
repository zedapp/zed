/* global chrome, define */
define(function(require, exports, module) {
    plugin.provides = ["windows"];
    return plugin;

    function plugin(options, imports, register) {
        chrome.runtime.getBackgroundPage(function(bgPage) {
            bgPage.openProjects = bgPage.openProjects || {};
            var api = {
                openProjects: bgPage.openProjects,
                getOpenWindow: function() {
                    if (bgPage.openWindow.contentWindow.window) {
                        return bgPage.openWindow;
                    } else {
                        return null;
                    }
                },
                setOpenWindow: function() {
                    bgPage.openWindow = chrome.app.window.current();
                },
                closeAll: function() {
                    chrome.app.window.getAll().forEach(function(win) {
                        win.close();
                    });
                }
            };
            register(null, {
                windows: api
            });
        });
    }
});
