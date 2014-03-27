var session = require("zed/session");
var preview = require("zed/preview");

module.exports = function(data) {
    return session.getText(data.path).then(function(text) {
       return preview.showPreview(text);
    });
};
