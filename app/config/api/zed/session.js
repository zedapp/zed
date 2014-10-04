/* global sandboxRequest*/
module.exports = {
    goto: function(path) {
        return sandboxRequest("zed/session", "goto", [path]);
    },
    deleteSession: function(path) {
        return sandboxRequest("zed/session", "deleteSession", [path]);
    },
    callCommand: function(path, command, info) {
        return sandboxRequest("zed/session", "callCommand", [path, command, info]);
    },
    setAnnotations: function(path, annos) {
        return sandboxRequest("zed/session", "setAnnotations", [path, annos]);
    },
    getText: function(path) {
        return sandboxRequest("zed/session", "getText", [path]);
    },
    setText: function(path, text) {
        return sandboxRequest("zed/session", "setText", [path, text]);
    },
    insertAtCursor: function(path, text) {
        return sandboxRequest("zed/session", "insertAtCursor", [path, text]);
    },
    insert: function(path, pos, text) {
        return sandboxRequest("zed/session", "insert", [path, pos, text]);
    },
    append: function(path, text) {
        return sandboxRequest("zed/session", "append", [path, text]);
    },
    getPreceedingIdentifier: function(path) {
        return sandboxRequest("zed/session", "getPreceedingIdentifier", [path]);
    },
    getAllLines: function(path) {
        return sandboxRequest("zed/session", "getAllLines", [path]);
    },
    removeInLine: function(path, row, start, end) {
        return sandboxRequest("zed/session", "removeInLine", [path, row, start, end]);
    },
    removeLines: function(path, start, end) {
        return sandboxRequest("zed/session", "removeLines", [path, start, end]);
    },
    getSelectionRange: function(path) {
        return sandboxRequest("zed/session", "getSelectionRange", [path]);
    },
    getSelectionText: function(path) {
        return sandboxRequest("zed/session", "getSelectionText", [path]);
    },
    getTextRange: function(path, start, end) {
        return sandboxRequest("zed/session", "getTextRange", [path, start, end]);
    },
    getCursorIndex: function(path) {
        return sandboxRequest("zed/session", "getCursorIndex", [path]);
    },
    setCursorIndex: function(path, index) {
        return sandboxRequest("zed/session", "setCursorIndex", [path, index]);
    },
    getCursorPosition: function(path) {
        return sandboxRequest("zed/session", "getCursorPosition", [path]);
    },
    getCursorPositions: function(path) {
        return sandboxRequest("zed/session", "getCursorPositions", [path]);
    },
    setCursorPosition: function(path, pos) {
        return sandboxRequest("zed/session", "setCursorPosition", [path, pos]);
    },
    getScrollPosition: function(path) {
        return sandboxRequest("zed/session", "getScrollPosition", [path]);
    },
    setScrollPosition: function(path, pos) {
        return sandboxRequest("zed/session", "setScrollPosition", [path, pos]);
    },
    replaceRange: function(path, range, text) {
        return sandboxRequest("zed/session", "replaceRange", [path, range, text]);
    },
    isInsertingSnippet: function(path) {
        return sandboxRequest("zed/session", "isInsertingSnippet", [path]);
    },
    getModeName: function(path) {
        return sandboxRequest("zed/session", "getModeName", [path]);
    },
    flashMessage: function(path, message, length) {
        return sandboxRequest("zed/session", "flashMessage", [path, message, length]);
    }
};
