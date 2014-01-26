define(function(require, exports, module) {
    var beautifier = require("configfs!./beautify-html.js");
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
                callback(null, beautified);
            });  
        });
    }

    return function(info, callback) {
        beautify(info.path, enhancedBeautifier, callback);
    };
});