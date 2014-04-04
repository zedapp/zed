define(function(require, exports, module) {
    plugin.consumes = ["open"];
    return plugin;

    function plugin(options, imports, register) {
        var open = imports.open;
        var gui = nodeRequire("nw.gui");
        var args = gui.App.argv;
        console.log("Arguments", args);
        if(args[0]) {
            open.open("node:" + args[0], args[0]);
        }
        register();
    }
});
