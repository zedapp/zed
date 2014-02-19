define(function(require, exports, module) {
    var session = require("zed/session");

    return function(path, beautifier, callback) {
        session.getSelectionRange(path, function(err, selectionRange) {
            var wholeDocument = false;
            if(selectionRange.start.row === selectionRange.end.row &&
               selectionRange.start.column === selectionRange.end.column) {
                wholeDocument = true;
            } else {
                selectionRange.start.column = 0;
                selectionRange.end.column = 1024;
            }

            function beautifyText(err, text) {
                beautifier(text, function(err, beautified) {
                    if(wholeDocument) {
                        session.setText(path, beautified, callback);
                    } else {
                        session.replaceRange(path, selectionRange, beautified, callback);
                    }
                });
            }

            if(wholeDocument) {
                session.getText(path, beautifyText);
            } else {
                session.getTextRange(path, selectionRange, beautifyText);
            }
        });
    };
});