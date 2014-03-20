var beautifier = require("./beautify-css.js");
var beautify = require("zed/lib/beautify");


/**
 * inputs: preferences
 */
module.exports = function(data, callback) {
    var preferences = data.inputs.preferences;

    beautify(data.path, enhancedBeautifier, callback);

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
