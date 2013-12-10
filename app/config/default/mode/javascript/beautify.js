define(function(require, exports, module) {
    var beautifier = require("configfs!./beautify-js.js");
    var beautify = require("zed/lib/beautify");
    
    function enhancedBeautifier(text) {
        // Some tweaks for generator functions
        console.log("HEreereere");
        return beautifier(text).replace(/function \* \(/g, "function*(")
                               .replace(/function \* (\w)/g, "function* $1");
    }

    return function(data, callback) {
        beautify(data.path, enhancedBeautifier, callback);
    };
});