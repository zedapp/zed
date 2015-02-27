define(function(require, exports, module) {
    plugin.provides = ["background"];
    return plugin;

    function plugin(opts, imports, register) {
        var bgProm;
        if(window.isNodeWebkit) {
            bgProm = require("./background.nw")();
        } else {
            bgProm = require("./background.chrome")();
        }
        bgProm.then(function(bg) {
            register(null, {
                background: bg
            });
        });
    }
});
