define(function(require, exports, module) {
    var beautifier = require("settingsfs!./beautify-html.js");
    var beautify = require("zed/lib/beautify");

    return function(info, callback) {
        beautify(info.path, beautifier, callback);
    };
});