define(function(require, exports, module) {
    var session = require("zed/session");
    var preview = require("zed/preview");

    var coffee = require("./coffee-script.js");
    require("./rainbow-custom.min.js");

    return function(data, callback) {
        session.getText(data.path, function(err, text) {
            var javascript = coffee.compile(text);
            Rainbow.color(javascript, 'javascript', function(highlighted_code) {
                preview.showPreview("<link href='https://raw.github.com/ccampbell/rainbow/master/themes/github.css' rel='stylesheet' type='text/css'><pre><code>" + highlighted_code + "</code></pre>", callback);
            });
        });
    };
});