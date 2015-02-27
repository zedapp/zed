/*global define, _, nodeRequire */
define(function(require, exports, module) {
    return function() {
        var api = {
            set: function(key, value) {
                localStorage[key] = JSON.stringify(value);
                return Promise.resolve();
            },
            get: function(key) {
                var val = localStorage[key];
                if (!val) {
                    return Promise.resolve(val);
                } else {
                    return Promise.resolve(JSON.parse(val));
                }
            },
            delete: function(key) {
                delete localStorage[key];
                return Promise.resolve();
            }
        };
        return api;
    };
});
