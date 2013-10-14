/* global define, sandboxRequest*/
define(function(require, exports, module) {
    return {
        setAnnotations: function(annos, callback) {
            sandboxRequest("zed/editor", "setAnnotations", [annos], callback);
        },
        getText: function(callback) {
            sandboxRequest("zed/editor", "getText", [], callback);
        },
        setText: function(text, callback) {
            sandboxRequest("zed/editor", "setText", [text], callback);
        },
        getAllLines: function(callback) {
            sandboxRequest("zed/editor", "getAllLines", [], callback);
        },
        getSelectionRange: function(callback) {
            sandboxRequest("zed/editor", "getSelectionRange", [], callback);
        },
        getSelectionText: function(callback) {
            sandboxRequest("zed/editor", "getSelectionText", [], callback);
        },
        getTextRange: function(range, callback) {
            sandboxRequest("zed/editor", "getTextRange", [range], callback);
        },
        getCursorPosition: function(callback) {
            sandboxRequest("zed/editor", "getCursorPosition", [], callback);
        },
        setCursorPosition: function(pos, callback) {
            sandboxRequest("zed/editor", "setCursorPosition", [pos], callback);
        },
        getScrollPosition: function(callback) {
            sandboxRequest("zed/editor", "getScrollPosition", [], callback);
        },
        setScrollPosition: function(pos, callback) {
            sandboxRequest("zed/editor", "setScrollPosition", [pos], callback);
        },
        replaceRange: function(range, text, callback) {
            sandboxRequest("zed/editor", "replaceRange", [range, text], callback);
        }
    };
});