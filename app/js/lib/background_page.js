/* global chrome */
define(function(require, exports, module) {
    var backgroundPage = null;
    chrome.runtime.getBackgroundPage(function(bg) {
        backgroundPage = bg;
    });
    return {
        getBackgroundPage: function() {
            return backgroundPage;
        }
    };
});