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
        },

        /**
         * Sends a HTTP POST request to the given URL.
         * 
         * options:
         * 
         *     headers: {Object},
         *     data: {Object || String}: Payload
         *     type: {String}: Response MIME type
         * 
         */
        post: function(url, options, callback) {
            options = options || {};

            $.ajax({
                url: url,
                type: 'POST',
                headers: options.headers,
                data: options.data,
                dataType: options.type
            }, function(body) {
                callback(null, body);
            }).fail(function(jqXHR) {
                callback(jqXHR.status);
            });
        }
    };
});