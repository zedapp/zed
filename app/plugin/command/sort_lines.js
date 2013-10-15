define(function(require, exports, module) {
    var session = require("zed/session");

    function sortLines(text) {
        var lines = text.split("\n");
        lines.sort();
        return lines.join("\n");
    }

    return function(info, callback) {
        var path = info.path;
        
        session.getSelectionText(path, function(err, selectedText) {
            if(selectedText) {
                var sortedText = sortLines(selectedText);
                session.getSelectionRange(path, function(err, range) {
                    session.replaceRange(path, range, sortedText, callback);
                });
            } else {
                session.getText(path, function(err, text) {
                    var sortedText = sortLines(text);
                    session.setText(path, sortedText, callback);
                });
            }
        });
    };
});