define(function(require, exports, module) {
    require("ace/ace.js");
    require("ace/ext-static_highlight.js");
    var coffee = require("./coffee-script.js");
    require("./rainbow-custom.min.js");
    return function(options, content, callback) {
        var javascript = coffee.compile(content);
        Rainbow.color(javascript, 'javascript', function(highlighted_code) {
            callback(null, " <link href='plugin/preview/javascript-highlight.css' rel='stylesheet' type='text/css'><pre><code>" + highlighted_code + "</code></pre>");
        });
    };
});