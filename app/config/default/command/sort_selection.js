define(function(require, exports, module) {
    var session = require("zed/session");

    return function(options, callback) {
        var selected_lines = [];
        var chopped = false;
        session.getSelectionText(options.path, function(ignored, text) {
            if (text.slice(text.length - 1) == "\n") {
                chopped = true;
                text = text.substring(0, text.length - 1);
            }
            selected_lines = text.split("\n").sort();
        });

        session.getSelectionRange(options.path, function(ignored, range) {
            if (chopped) {
                selected_lines.push("");
            }
            session.replaceRange(
                options.path, range, selected_lines.join("\n"), callback);
        });
    };
});
