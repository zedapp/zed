/* global define */
define(function(require, exports, module) {
    var preview = require("../../preview");

    return {
        showPreview: function(html, callback) {
            preview.showPreview(html);
            callback();
        }
    };
});