define(function(require, exports, module) {
    "use strict";
    var editor = require("./editor");
    
    exports.jump = function(locator, selectionRange) {
        console.log("Jumping to locator: ", locator);
        var edit = editor.getActiveEditor();
        if(locator[0] === "/") {
            edit.find(locator.substring(1), {
                start: selectionRange || edit.getSelectionRange()
            });
        } else {
            try {
                var lineNo = parseInt(locator, 10);
                edit.gotoLine(lineNo);
            } catch(e) {}
        }
    };
});