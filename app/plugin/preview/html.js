define(function(require, exports, module) {
    var session = require("zed/session");
    var preview = require("zed/preview");

    return function(data, callback) {
        session.getText(data.path, function(err, text) {
           preview.showPreview(text, callback);
        });
    };
});