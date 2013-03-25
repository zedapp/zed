/*global define*/
define(function(require, exports, module) {
    "use strict";
    var editor = require("../editor");
    var ctags = require("../ctags");
    
    exports.jump = function(locator, selectionRange) {
        var edit = editor.getActiveEditor();
        if(locator[0] === "/") {
            edit.find(locator.substring(1), {
                start: selectionRange || edit.getSelectionRange(),
                wrap: true
            });
        } if(locator[0] === "@") {
            var path = edit.getSession().filename;
            
        } else {
            try {
                var lineNo = parseInt(locator, 10);
                edit.gotoLine(lineNo);
            } catch(e) {}
        }
    };
});