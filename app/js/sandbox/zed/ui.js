/*global zed, define*/
define(function(require, exports, module) {
    return {
        prompt: function(message, inputText, width, height) {
            return zed.getService("ui").prompt({
                width: width,
                height: height,
                message: message,
                input: inputText
            });
        },
        blockUI: function(message, withSpinner) {
            zed.getService("ui").blockUI(message, !withSpinner);
            return Promise.resolve();
        },
        unblockUI: function() {
            zed.getService("ui").unblockUI();
            return Promise.resolve();
        },
    };
});
