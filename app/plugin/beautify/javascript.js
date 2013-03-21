define(function(require, exports, module) {
    var beautify = require("./beautify-js.js");
    
    return function(options, content, callback) {
        callback(null, beautify(content, options));
    };
});