define(function(require, exports, module) {
    var coffee = require("../preview/coffee-script.js");
    return function(options, content, callback) {
        var javascript = coffee.compile(content);
        var path = options.path.replace(/\.cs$/, ".js");
        callback(null, {outputPath: path, content: javascript});
    };
});