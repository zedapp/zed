define(function(require, exports, module) {
    return function() {
        return new Promise(function(resolve) {
            chrome.runtime.getBackgroundPage(function(bg) {
                resolve(bg);
            });
        });
    };
});
