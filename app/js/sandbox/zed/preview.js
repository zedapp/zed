/* global define, zed */
define(function(require, exports, module) {
    return {
        showPreview: function(html, callback) {
            zed.getService("preview").showPreview(html);
            callback();
        }
    };
});
