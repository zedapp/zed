/* global sandboxRequest*/
module.exports = {
    updateCTags: function(path, tags, callback) {
        sandboxRequest("zed/ctags", "updateCTags", [path, tags], callback);
    },
    getCTags: function(callback) {
        sandboxRequest("zed/ctags", "getCTags", [], callback);
    }
};