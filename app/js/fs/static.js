/**
 * This module implements the read-only file system, essentially a simple
 * way to serve files from folders from within the Zed application
 */
/*global define */
define(function(require, exports, module) {
    plugin.provides = ["fs"];
    return plugin;

    function plugin(options, imports, register) {
        var http_cache = require("../lib/http_cache");
        var root = options.url;
        var readOnlyFn = options.readOnlyFn;

        var api = {
            listFiles: function() {
                return http_cache.fetchUrl(root + "/all", {}).then(function(res) {
                    var items = res.split("\n");
                    for (var i = 0; i < items.length; i++) {
                        if (!items[i]) {
                            items.splice(i, 1);
                            i--;
                        }
                    }
                    return items;
                });
            },
            readFile: function(path) {
                return http_cache.fetchUrl(root + path, {}).then(function(text) {
                    if (readOnlyFn && readOnlyFn(path)) {
                        window.readOnlyFiles[path] = true;
                        return text;
                    } else {
                        return text;
                    }
                });
            },
            writeFile: function(path, content) {
                return Promise.reject(405); // Method not allowed
            },
            deleteFile: function(path) {
                return Promise.reject(405); // Method not allowed
            },
            watchFile: function() {
                // Nop
            },
            unwatchFile: function() {
                // Nop
            },
            getCacheTag: function(path) {
                return http_cache.fetchUrl(root + path, {}).then(function() {
                    return "unchanged";
                }, function(err) {
                    return Promise.reject(404);
                });
            }
        };

        register(null, {
            fs: api
        });
    }
});
