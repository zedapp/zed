define(function(require, exports, module) {
    var beautifier = require("./beautify-css.js");
    var beautify = require("zed/lib/beautify");

    return function(data, callback) {
        beautify(beautifier, callback);
    };
});