/*global define, zed*/
define(function(require, exports, module) {
    return {
        updateSymbols: function(path, tags, callback) {
            zed.getService("symbol").updateSymbols(path, tags);
            callback();
        },
        getSymbols: function(opts, callback) {
            zed.getService("symbol").getSymbols(opts).then(function(syms) {
                callback(null, syms);
            }, function(err) {
                callback(err);
            });
        }
    };
});
