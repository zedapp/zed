define(function(require, exports, module) {
    plugin.provides = ["background"];
    return plugin;

    function plugin(opts, imports, register) {
        register(null, {
            background: process.mainModule.exports
        });
    }
});
