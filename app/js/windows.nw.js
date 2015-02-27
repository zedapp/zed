/* global chrome, define */
define(function(require, exports, module) {
    return function() {
        global.openProjects = global.openProjects || {};
        var api = {
            openProjects: global.openProjects,
            getOpenWindow: function() {
                try {
                    var title = global.openWindow.title;
                    return global.openWindow;
                } catch(e) {
                    return null;
                }
            },
            setOpenWindow: function() {
                global.openWindow = nodeRequire("nw.gui").Window.get();
            },
            closeAll: function() {
                var gui = nodeRequire("nw.gui");
                gui.App.quit();
            }
        };
        return Promise.resolve(api);
    };
});
