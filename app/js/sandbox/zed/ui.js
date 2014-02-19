define(function(require, exports, module) {
    var ui = require("../../lib/ui");
    return {
        prompt: function(message, inputText, width, height, callback) {
            ui.prompt({
                width: width,
                height: height,
                message: message,
                input: inputText
            }, callback);
        },
        blockUI: function(message, withSpinner, callback) {
            ui.blockUI(message, !withSpinner);
            callback();
        },
        unblockUI: function(callback) {
            ui.unblockUI();
            callback();
        },
    };
});