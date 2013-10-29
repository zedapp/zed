/**
 * This module implements the read-only file system, essentially a simple
 * way to serve files from folders from within the Zed application
 */
/*global define */
define(function(require, exports, module) {
    var http_cache = require("../lib/http_cache");

    /**
     * @param options
     *     - readOnlyFn: function that takes a path and returns whether the file should be read-only
     */
    return function(root, options, callback) {
        callback(null, {
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
                        readOnly: options.readOnlyFn && options.readOnlyFn(path)
                    });
                });
            },
            writeFile: function(path, content, callback) {
                callback(405); // Method not allowed
            },
            deleteFile: function(path, callback) {
                callback(405); // Method not allowed
            },
            getUrl: function(path, callback) {
                callback(null, root + path);
            },
            watchFile: function() {
                // Nop
            },
            unwatchFile: function() {
                // Nop
            }
        });
    };
});