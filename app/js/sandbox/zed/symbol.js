/*global define, zed*/
define(function(require, exports, module) {
    return {
        updateSymbols: function(path, tags) {
            zed.getService("symbol").updateSymbols(path, tags);
            return Promise.resolve();
        },
        getSymbols: function(opts) {
            return zed.getService("symbol").getSymbols(opts);
        }
    };
});
