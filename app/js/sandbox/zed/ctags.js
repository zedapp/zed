/*global define, zed*/
define(function(require, exports, module) {
    return {
        updateCTags: function(path, tags, callback) {
            zed.getService("ctags").updateCTags(path, tags);
            callback();
        },
        getCTags: function(callback) {
            callback(null, zed.getService("ctags").getCTags());
        }
    };
});
