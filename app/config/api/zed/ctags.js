/* global sandboxRequest*/
module.exports = {
    updateCTags: function(path, tags) {
        return sandboxRequest("zed/ctags", "updateCTags", [path, tags]);
    },
    getCTags: function() {
        return sandboxRequest("zed/ctags", "getCTags", []);
    }
};
