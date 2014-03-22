var preview = require("zed/preview");

var coffee = require("./coffee-script.js");

/**
 * inputs: text
 */
module.exports = function(info, callback) {
    var text = info.inputs.text;
    var javascript = coffee.compile(text);
    preview.showPreview("<pre>" + javascript.replace(/</g, "&lt;") + "</pre>", callback);
};
