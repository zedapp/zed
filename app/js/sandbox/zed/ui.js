/*global zed, define*/
define(function(require, exports, module) {
    return {
        prompt: function(message, inputText, width, height, callback) {
            zed.getService("ui").prompt({
                width: width,
                height: height,
                message: message,
                input: inputText
            }, callback);
        },
        blockUI: function(message, withSpinner, callback) {
            zed.getService("ui").blockUI(message, !withSpinner);
            callback();
        },
        unblockUI: function(callback) {
            zed.getService("ui").unblockUI();
            callback();
        },
    };
});
