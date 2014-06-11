/* global define, $ */
define(function(require, exports, module) {
    var http_cache = require("../../lib/http_cache");
    
    /**
     * A request wrapper around the jQuery AJAX function.
     * 
     * options:
     * 
     *     headers: {Object}
     *
     *         The HTTP headers
     * 
     *     data: {Object || String} (optional)
     * 
     *          The HTTP request body payload.
     *
     *     type: {String} (optional; default = "Intelligent Guess")
     * 
     *          The type of data expected from the server.
     * 
     * @param {String} verb The HTTP verb (e.g. POST, PUT, etc.)
     * @param {String} url The URL endpoint to which the request should be send.
     * @param {Object} options The jQuery request configuration.
     * @param {Function} callback Node.js style callback.
     * 
     */
    function request(verb, url, options, callback) {
        var args = {};
        
        options = options || {};
        args.url = url;
        args.type = verb;
        args.headers = options.headers;
        args.data = options.data;
        args.dataType = options.dataType;

        $.ajax(args)
            .done(function onDone (data, status, jqXHR) {
                var payload = [
                    data,
                    jqXHR.status,
                    convertResponseHeaders(jqXHR.getAllResponseHeaders())
                ];

                callback(null, payload);
            })
            .fail(function onFail (jqXHR) {
                callback(jqXHR.status)
            });
    }
    
    /**
     * The XHR object returns a string with all response header entries in the form:
     * 
     *     key: "value"
     * 
     * This function converts this string to an object representation.
     * 
     * @param {String} source The headers from the XHR object.
     * 
     * @returns {Object}
     * 
     */
    function convertResponseHeaders(source) {
        var newline = /\r?\n/;
        var headers = {};

        if (!source) {
            return headers;
        }

        source = source.trim();
        source = source.split(newline);

        source.forEach(function onEntry (header) {
            var position = header.indexOf(':');
            var key = header.substr(0, position);
            var value = header.substr(position + 1).trim();

            headers[key] = value;
        });

        return headers;
    }
    
    return {
        fetchUrl: function(url, callback) {
            http_cache.fetchUrl(url, {}, callback);
        },
        get: function(url, type, callback) {
            var options = {
                dataType: type
            };

            request('GET', url, options, callback);
        },
        post: function(url, options, callback) {
            request('POST', url, options, callback);
        },
        put: function(url, options, callback) {
             request('PUT', url, options, callback);
        },
        del: function(url, options, callback) {
            request('DELETE', url, options, callback);
        }
    };
});
