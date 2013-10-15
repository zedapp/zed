/* global define, sandboxRequest*/
define(function(require, exports, module) {
    return {
        setAnnotations: function(path, annos, callback) {
            sandboxRequest("zed/session", "setAnnotations", [path, annos], callback);
        },
        getText: function(path, callback) {
            sandboxRequest("zed/session", "getText", [path, ], callback);
        },
        setText: function(path, text, callback) {
            sandboxRequest("zed/session", "setText", [path, text], callback);
        },
        getAllLines: function(path, callback) {
            sandboxRequest("zed/session", "getAllLines", [path], callback);
        },
        getSelectionRange: function(path, callback) {
            sandboxRequest("zed/session", "getSelectionRange", [path], callback);
        },
        getSelectionText: function(path, callback) {
            sandboxRequest("zed/session", "getSelectionText", [path], callback);
        },
        getTextRange: function(path, range, callback) {
            sandboxRequest("zed/session", "getTextRange", [path, range], callback);
        },
        getCursorPosition: function(path, callback) {
            sandboxRequest("zed/session", "getCursorPosition", [path], callback);
        },
        setCursorPosition: function(path, pos, callback) {
            sandboxRequest("zed/session", "setCursorPosition", [path, pos], callback);
        },
        getScrollPosition: function(path, callback) {
            sandboxRequest("zed/session", "getScrollPosition", [path, ], callback);
        },
        setScrollPosition: function(path, pos, callback) {
            sandboxRequest("zed/session", "setScrollPosition", [path, pos], callback);
        },
        replaceRange: function(path, range, text, callback) {
            sandboxRequest("zed/session", "replaceRange", [path, range, text], callback);
        }
    };
});