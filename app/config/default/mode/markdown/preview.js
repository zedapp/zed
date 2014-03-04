var Markdown = require("./pagedown.js")
var session = require("zed/session");
var preview = require("zed/preview");

module.exports = function(data, callback) {
    session.getText(data.path, function(err, text) {
        var converter = new Markdown.Converter();
        var html = converter.makeHtml(text);
        preview.showPreview(html, callback);
    });
};