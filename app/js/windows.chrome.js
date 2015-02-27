/* global chrome, define */
define(function(require, exports, module) {
    return function() {
        return new Promise(function(resolve) {
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
                resolve(api);
            });
        });
    };
});
