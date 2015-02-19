/*global define, $ */
define(function(require, exports, module) {
    plugin.provides = ["fs"];
    return plugin;

    function plugin(options, imports, register) {
        var api = {
            isEmpty: true,
            listFiles: function() {
                return Promise.resolve([]);
            },
            readFile: function() {
                return Promise.reject(405); // Method not allowed
            },
            writeFile: function() {
                return Promise.reject(405);
            },
            deleteFile: function() {
                return Promise.reject(405);
            },
            watchFile: function() {

            },
            unwatchFile: function() {

            },
            getCacheTag: function() {
                return Promise.resolve("unchanged");
            },
            getCapabilities: function() {
                return {};
            }
        };

        register(null, {
            fs: api
        });
    }
});
