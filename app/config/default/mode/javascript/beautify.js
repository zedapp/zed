var beautifier = require("./beautify-js.js");
var beautify = require("zed/lib/beautify");

/**
 * Required inputs: text, preferences
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
        beautified = beautified.replace(/function \* \(/g, "function*(");
        beautified = beautified.replace(/function \* (\w)/g, "function* $1");
        callback(null, beautified);
    }
};
