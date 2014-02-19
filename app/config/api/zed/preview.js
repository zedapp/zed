/* global define, sandboxRequest*/
define(function(require, exports, module) {
    return {
        showPreview: function(html, callback) {
            sandboxRequest("zed/preview", "showPreview", [html], callback);
        }
    };
});