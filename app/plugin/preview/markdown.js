define(function(require, exports, module) {
    require("./showdown.js");
    var editor = require("zed/editor");
    var preview = require("zed/preview");

    return function(data, callback) {
        editor.getText(function(err, text) {
            var converter = new Showdown.converter();
            var html = converter.makeHtml(text);
            preview.showPreview(html, callback);
        });
    };
});