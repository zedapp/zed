define(function(require, exports, module) {
    var Markdown = require("configfs!./pagedown.js")
    var session = require("zed/session");
    var preview = require("zed/preview");

    return function(data, callback) {
        session.getText(data.path, function(err, text) {
            var converter = new Markdown.Converter();
            var html = converter.makeHtml(text);
            preview.showPreview(html, callback);
        });
    };
});