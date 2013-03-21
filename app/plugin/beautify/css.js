define(function(require, exports, module) {
    var beautify = require("./beautify-css.js");
    
    return function(options, content, callback) {
        callback(null, beautify(content, options));
    };
});