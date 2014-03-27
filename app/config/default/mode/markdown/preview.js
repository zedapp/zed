var Markdown = require("./pagedown.js")
var preview = require("zed/preview");

/**
 * Required inputs: text
 */
module.exports = function(info) {
    var text = info.inputs.text;
    var converter = new Markdown.Converter();
    var html = converter.makeHtml(text);
    return preview.showPreview(html);
};
