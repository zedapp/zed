/* global define, zed */
define(function(require, exports, module) {
    return {
        showPreview: function(html, open, callback) {
            if ('function' === typeof open) {
                callback = open;
                open = undefined;
            }
            
            zed.getService("preview").showPreview(html, open);
            callback();
        }
    };
});
