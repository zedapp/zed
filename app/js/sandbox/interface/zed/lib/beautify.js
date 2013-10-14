define(function(require, exports, module) {
    var editor = require("zed/editor");
    var async = require("zed/lib/async");

    return function(beautifier, callback) {
        async.doGets(editor, ["getSelectionRange", "getCursorPosition", "getScrollPosition"], function(selectionRange, cursorPosition, scrollPosition) {
            var wholeDocument = false;
            if(selectionRange.start.row === selectionRange.end.row &&
               selectionRange.start.column === selectionRange.end.column) {
                wholeDocument = true;
            } else {
                selectionRange.start.column = 0;
                selectionRange.end.column = 1024;
            }

            function beautifyText(err, text) {
                var beautified = beautifier(text);

                function restorePos() {
                    editor.setScrollPosition(scrollPosition, function() {
                        editor.setCursorPosition(cursorPosition, callback);
                    });
                }
                if(wholeDocument) {
                    editor.setText(beautified, restorePos);
                } else {
                    editor.replaceRange(selectionRange, beautified, restorePos);
                }
            }

            if(wholeDocument) {
                editor.getText(beautifyText);
            } else {
                editor.getTextRange(selectionRange, beautifyText);
            }
        });
    };
});