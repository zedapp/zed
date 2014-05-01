/*global define, zed*/
define(function(require, exports, module) {
    return {
        updateCTags: function(path, tags, callback) {
            //zed.getService("ctags").updateCTags(path, tags);
            zed.getService("ctags").updateSymbols(path, tags);
            callback();
        },
        getCTags: function(opts, callback) {
            //callback(null, zed.getService("ctags").getCTags());
            zed.getService("ctags").getSymbols(opts).then(function(syms) {
                callback(null, syms);
            }, function(err) {
                callback(err);
            });
        }
    };
});
