var beautifier = require("./beautify-html.js");
var beautify = require("zed/lib/beautify");

/**
 * Inputs: preferences
 */
module.exports = function(info, callback) {
    var preferences = info.inputs.preferences;
    beautify(info.path, enhancedBeautifier, callback);

    function enhancedBeautifier(text, callback) {
        var indentChar = ' ';
        if (!preferences.useSoftTabs) {
            indentChar = '\t';
            preferences.tabSize = 1;
        }
        var options = {
            "indent_size": preferences.tabSize,
            "indent_char": indentChar
        };

        // Some tweaks for generator functions
        var beautified = beautifier(text, options);
        callback(null, beautified);
    }
};
