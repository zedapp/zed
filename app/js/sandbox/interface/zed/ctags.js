/* global define, sandboxRequest*/
define(function(require, exports, module) {
    return {
        updateCTags: function(path, tags, callback) {
            sandboxRequest("zed/ctags", "updateCTags", [path, tags], callback);
        },
        getCTags: function(callback) {
            sandboxRequest("zed/ctags", "getCTags", [], callback);
        }
    };
});