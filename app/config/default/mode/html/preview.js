var session = require("zed/session");
var preview = require("zed/preview");

module.exports = function(data, callback) {
    session.getText(data.path, function(err, text) {
       preview.showPreview(text, callback);
    });
};