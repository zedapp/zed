/*global define, _, nodeRequire */
define(function(require, exports, module) {
    return function() {
        var api = {
            set: function(key, value) {
                return new Promise(function(resolve) {
                    var obj = {};
                    obj[key] = value;
                    chrome.storage.sync.set(obj, function() {
                        resolve();
                    });
                });
            },
            get: function(key) {
                return new Promise(function(resolve) {
                    chrome.storage.sync.get(key, function(results) {
                        resolve(results[key]);
                    });
                });
            },
            delete: function(key) {
                return new Promise(function(resolve) {
                    chrome.storage.sync.remove(key, function() {
                        resolve();
                    });
                });
            }
        };
        return api;
    };
});
