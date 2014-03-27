var beautifier = require("./beautify-css.js");
var beautify = require("zed/lib/beautify");

/**
 * inputs: preferences
 */
module.exports = function(data) {
    var preferences = data.inputs.preferences;

    return beautify(data.path, enhancedBeautifier);

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
