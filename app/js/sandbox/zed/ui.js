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
        openUrl: function(url) {
            if (window.isNodeWebkit) {
                var gui = nodeRequire('nw.gui');
                gui.Shell.openExternal(url);
            } else {
                var a = document.createElement('a');
                a.href = url;
                a.target = '_blank';
                a.click();
            }
            return Promise.resolve();
        },
        showWebview: function(url) {
            zed.getService("ui").showWebview(url);
            return Promise.resolve();
        },
        hideWebview: function() {
            zed.getService("ui").hideWebview();
            return Promise.resolve();
        }
    };
});
