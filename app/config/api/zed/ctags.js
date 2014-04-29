/* global sandboxRequest*/
module.exports = {
    updateCTags: function(path, tags) {
        return sandboxRequest("zed/ctags", "updateCTags", [path, tags]);
    },
    getCTags: function(opts) {
        return sandboxRequest("zed/ctags", "getCTags", [opts]);
    }
};
