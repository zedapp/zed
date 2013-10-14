/* global define */
define(function(require, exports, module) {
    var preview = require("../../../tool/preview");

    return {
        showPreview: function(html, callback) {
            preview.showPreview(html);
            callback();
        }
    };
});