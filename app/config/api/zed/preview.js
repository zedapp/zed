/* global sandboxRequest*/
module.exports = {
    showPreview: function(html) {
        return sandboxRequest("zed/preview", "showPreview", [html]);
    }
};
