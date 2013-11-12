/* global define, sandboxRequest*/
define(function(require, exports, module) {
    return {
        prompt: function(message, inputText, width, height, callback) {
            sandboxRequest("zed/ui", "prompt", [message, inputText, width, height], callback);
        },
        blockUI: function(message, withSpinner, callback) {
            sandboxRequest("zed/ui", "blockUI", [message, withSpinner], callback);
        },
        unblockUI: function(callback) {
            sandboxRequest("zed/ui", "unblockUI", [], callback);
        }
    };
});