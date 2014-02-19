define(function(require, exports, module) {
    var ctags = require("../../ctags");
    return {
        updateCTags: function(path, tags, callback) {
            ctags.updateCTags(path, tags);
            callback();
        },
        getCTags: function(callback) {
            callback(null, ctags.getCTags());
        }
    };
});