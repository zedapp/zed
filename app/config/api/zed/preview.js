/* global sandboxRequest*/
module.exports = {
    showPreview: function(html, callback) {
        sandboxRequest("zed/preview", "showPreview", [html], callback);
    }
};