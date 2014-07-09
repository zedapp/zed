/* global define, zed */
define(function(require, exports, module) {
    return {
        showPreview: function(html, open) {
            zed.getService("preview").showPreview(html, open);
            return Promise.resolve();
        }
    };
});
