define(function(require, exports, module) {
    var editor = require("zed/editor");
    var preview = require("zed/preview");

    var coffee = require("./coffee-script.js");
    require("./rainbow-custom.min.js");
    return function(options, content, callback) {
        editor.getText(function(err, text) {
            var javascript = coffee.compile(text);
            Rainbow.color(javascript, 'javascript', function(highlighted_code) {
                preview.showPreview("<link href='plugin/preview/javascript-highlight.css' rel='stylesheet' type='text/css'><pre><code>" + highlighted_code + "</code></pre>", callback);
            });
        });
    };
});