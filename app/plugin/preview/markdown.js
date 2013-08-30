define(function(require, exports, module) {
    require("./showdown.js");

    return function(options, content, callback) {
        var converter = new Showdown.converter();
        var html = converter.makeHtml(content);
        callback(null, html);
    };
});