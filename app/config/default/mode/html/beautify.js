var beautifier = require("./beautify-html.js");
var beautify = require("zed/lib/beautify");

/**
 * Inputs: preferences
 */
module.exports = function(info) {
    var preferences = info.inputs.preferences;
    return beautify(info.path, enhancedBeautifier);

    function enhancedBeautifier(text) {
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
        return beautifier(text, options);
    }
};
