define(function(require, exports, module) {
    require("./showdown.js");
    var session = require("zed/session");
    var preview = require("zed/preview");

    return function(data, callback) {
        session.getText(data.path, function(err, text) {
            var converter = new Showdown.converter();
            var html = converter.makeHtml(text);
            preview.showPreview(html, callback);
        });
    };
});