var beautifier = require("./beautify-js.js");
var beautify = require("zed/lib/beautify");
var config = require("zed/config");

function enhancedBeautifier(text, callback) {
    config.getPreference("tabSize", function(err, tabSize) {
        config.getPreference("useSoftTabs", function(err, useSoftTabs) {
            var indentChar = ' ';
            if (!useSoftTabs) {
                indentChar = '\t';
                tabSize = 1;
            }
            var options = {
                "indent_size": tabSize,
                "indent_char": indentChar
            };

            // Some tweaks for generator functions
            var beautified = beautifier(text, options);
            beautified = beautified.replace(/function \* \(/g, "function*(");
            beautified = beautified.replace(/function \* (\w)/g, "function* $1");
            callback(null, beautified);
        });
    });
}

module.exports = function(data, callback) {
    beautify(data.path, enhancedBeautifier, callback);
};