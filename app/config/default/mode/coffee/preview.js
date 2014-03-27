var preview = require("zed/preview");

var coffee = require("./coffee-script.js");

/**
 * inputs: text
 */
module.exports = function(info) {
    var text = info.inputs.text;
    var javascript = coffee.compile(text);
    return preview.showPreview("<pre>" + javascript.replace(/</g, "&lt;") + "</pre>");
};
