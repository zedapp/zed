/*global define*/
define(function(require, exports, module) {
    "use strict";
    var editor = require("../editor");

    exports.parse = function(path) {
        var parts = path.split(':');
        if (parts.length === 1) {
            return parts;
        } else if (parts.length > 2 && !parts[1]) { // zed::bla
            return [path];
        } else {
            return [parts[0], parts.slice(1).join(":")];
        }
    };

    exports.jump = function(locator, selectionRange, selectedItem) {
        var edit = editor.getActiveEditor();
        if (locator[0] === "/") {
            edit.find(locator.substring(1), {
                start: selectionRange || edit.getSelectionRange(),
                wrap: true,
                caseSensitive: true,
                wholeWord: false
            });
        } else if (locator[0] === '@' && selectedItem) {
            var parts = selectedItem.split(":");
            return exports.jump(parts[1], selectionRange);
        } else {
            try {
                var lineNo = parseInt(locator, 10);
                edit.gotoLine(lineNo);
            } catch (e) {}
        }
    };
});