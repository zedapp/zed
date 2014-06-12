/* global sandboxRequest*/
module.exports = {
    /**
     * Renders a HTML snippet in the preview pane.
     *
     * @param {String} html The html snippet which should be injected into the preview pane.
     * @param {Boolean} open If true the method will also open the preview pane.
     *
     */
    showPreview: function(html, open) {
        return sandboxRequest("zed/preview", "showPreview", [html, open]);
    }
};
