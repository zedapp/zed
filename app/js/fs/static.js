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
            listFiles: function(callback) {
                http_cache.fetchUrl(root + "/all", {}, function(err, res) {
                    var items = res.split("\n");
                    for (var i = 0; i < items.length; i++) {
                        if (!items[i]) {
                            items.splice(i, 1);
                            i--;
                        }
                    }
                    callback(null, items);
                });
            },
            readFile: function(path, callback) {
                http_cache.fetchUrl(root + path, {}, function(err, text) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, text, {
                        readOnly: readOnlyFn && readOnlyFn(path)
                    });
                });
            },
            writeFile: function(path, content, callback) {
                callback(405); // Method not allowed
            },
            deleteFile: function(path, callback) {
                callback(405); // Method not allowed
            },
            watchFile: function() {
                // Nop
            },
            unwatchFile: function() {
                // Nop
            },
            getCacheTag: function(path, callback) {
                http_cache.fetchUrl(root + path, {}, function(err) {
                    if (err) {
                        return callback(404);
                    }
                    callback(null, "unchanged");
                });
            }
        };

        register(null, {
            fs: api
        });
    }
});
