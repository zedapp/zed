define(function(require, exports, module) {
    var showdown = require("configfs!./showdown.js");
    var session = require("zed/session");
    var preview = require("zed/preview");

    return function(data, callback) {
        session.getText(data.path, function(err, text) {
            var converter = new showdown.converter();
            var html = converter.makeHtml(text);
            preview.showPreview(html, callback);
        });
    };
});