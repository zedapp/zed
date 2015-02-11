/*global define, _, nodeRequire */
define(function(require, exports, module) {
    plugin.consumes = [];
    plugin.provides = ["local_store"];
    return plugin;

    function plugin(options, imports, register) {

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

        register(null, {
            local_store: api
        });
    }
});
