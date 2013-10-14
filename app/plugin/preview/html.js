define(function(require, exports, module) {
    var editor = require("zed/editor");
    var preview = require("zed/preview");

    return function(options, content, callback) {
        editor.getText(function(err, text) {
           preview.showPreview(text, callback);
        });
    };
});