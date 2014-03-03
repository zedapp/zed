/* global define, $ */
define(function(require, exports, module) {
    var http_cache = require("../../lib/http_cache");
    
    return {
        fetchUrl: function(url, callback) {
            http_cache.fetchUrl(url, {}, callback);
        },
        get: function(url, type, callback) {
            $.get(url, function(data) {
                callback(null, data);
            }, type).fail(function(jqXHR) {
                callback(jqXHR.status);
            });
        }
    };
});