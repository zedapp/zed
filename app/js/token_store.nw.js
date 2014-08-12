/*global define, _, nodeRequire */
define(function(require, exports, module) {
    plugin.consumes = [];
    plugin.provides = ["token_store"];
    return plugin;

    function plugin(options, imports, register) {

        var api = {
            set: function(key, value) {
                localStorage[key] = JSON.stringify(value);
                return Promise.resolve();
            },
            get: function(key) {
                return Promise.resolve(JSON.parse(localStorage[key]));
            },
            delete: function(key) {
                delete localStorage[key];
                return Promise.resolve();
            }
        };

        register(null, {
            token_store: api
        });
    }
});
