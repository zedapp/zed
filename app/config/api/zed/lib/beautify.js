var session = require("zed/session");

module.exports = function(path, beautifier) {
    var wholeDocument = false,
        selectionRange;

    return session.getSelectionRange(path).then(function(selectionRange_) {
        selectionRange = selectionRange_;
        if (selectionRange.start.row === selectionRange.end.row && selectionRange.start.column === selectionRange.end.column) {
            wholeDocument = true;
        } else {
            selectionRange.start.column = 0;
            selectionRange.end.column = 1024;
        }

        if (wholeDocument) {
            return session.getText(path).then(beautifyText);
        } else {
            return session.getTextRange(path, selectionRange.start, selectionRange.end).then(beautifyText);
        }
    });

    function beautifyText(text) {
        return Promise.resolve(text).then(beautifier).then(function(beautified) {
            if (wholeDocument) {
                return session.setText(path, beautified);
            } else {
                return session.replaceRange(path, selectionRange, beautified);
            }
        });
    }
};
