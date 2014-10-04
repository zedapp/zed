define(function(require, exports, module) {
    plugin.provides = ["background"];
    return plugin;

    function plugin(opts, imports, register) {
        chrome.runtime.getBackgroundPage(function(bg) {
            register(null, {
                background: bg
            });
        });
    }
});
