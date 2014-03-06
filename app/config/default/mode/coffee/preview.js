var session = require("zed/session");
var preview = require("zed/preview");

var coffee = require("./coffee-script.js");

module.exports = function(data, callback) {
    session.getText(data.path, function(err, text) {
        var javascript = coffee.compile(text);
        preview.showPreview("<pre>" + javascript.replace(/</g, "&lt;") + "</pre>", callback);
    });
};