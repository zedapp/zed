define(function(require, exports, module) {
    plugin.provides = ["background"];
    return plugin;

    function plugin(opts, imports, register) {
        var exp = process.mainModule.exports;
        // var win = nodeRequire("nw.gui").Window.get();
        register(null, {
            background: exp
            // background: {
            //     init: function() {
            //         exp.init();
            //     },
            //     configZedrem: function(newServer) {
            //         exp.configZedrem(newServer);
            //     },
            //     getOpenWindows: function() {
            //         return exp.getOpenWindows();
            //     },
            //     registerWindow: function(title, url, win) {
            //         return exp.registerWindow(title, url, win);
            //     },
            //     // this one passes window object
            //     openProject: function(title, url) {
            //         exp.openProject(title, url, win);
            //     }
            // }
        });
    }
});
