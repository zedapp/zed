define(function(require, exports, module) {
    "use strict";
    var editor = require("./editor");
    
    exports.jump = function(locator, selectionRange) {
        var edit = editor.getActiveEditor();
        if(locator[0] === "/") {
            edit.find(locator.substring(1), {
                start: selectionRange || edit.getSelectionRange(),
                wrap: true
            }, false);
        } else {
            try {
                var lineNo = parseInt(locator, 10);
                edit.gotoLine(lineNo, 0, false);
            } catch(e) {}
        }
        edit.centerSelection();
    };
});