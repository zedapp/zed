define(function(require, exports, module) {
    var session = require("zed/session");
    var preview = require("zed/preview");

    var coffee = require("settingsfs!./coffee-script.js");

    return function(data, callback) {
        session.getText(data.path, function(err, text) {
            var javascript = coffee.compile(text);
            preview.showPreview("<pre>" + javascript.replace(/</g, "&lt;") + "</pre>", callback);
        });
    };
});