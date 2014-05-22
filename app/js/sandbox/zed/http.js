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
     * 
     */
    function request (verb, url, options) {
        var args = {};
        
        options = options || {};
        args.url = url;
        args.type = verb;
        args.headers = options.headers;
        args.data = options.data;
        args.dataType = options.type;

        return $.ajax(args);
    }
    
    return {
        fetchUrl: function(url, callback) {
            http_cache.fetchUrl(url, {}, callback);
        },
        get: function(url, type, callback) {
            var options = {
                dataType: type
            };

            request('GET', url, options)
                .done(function onDone (data, status, jqXHR) {
                    var payload = [data, jqXHR.status, jqXHR.getAllResponseHeaders()];

                    callback(null, payload);
                })
                .fail(function onFail (jqXHR) {
                    callback(jqXHR.status)
                });
        },
        post: function(url, options, callback) {
            request('POST', url, options)
                .done(function onDone (data, status, jqXHR) {
                    var payload = [data, jqXHR.status, jqXHR.getAllResponseHeaders()];

                    callback(null, payload);
                })
                .fail(function onFail (jqXHR) {
                    callback(jqXHR.status);
                });
        },
        put: function(url, options, callback) {
             request('PUT', url, options)
                 .done(function onDone (data, status, jqXHR) {
                     var payload = [data, jqXHR.status, jqXHR.getAllResponseHeaders()];

                     callback(null, payload);
                 })
                 .fail(function onFail (jqXHR) {
                     callback(jqXHR.status);
                 });
         },
         del: function(url, options, callback) {
              request('DELETE', url, options)
                  .done(function onDone (data, status, jqXHR) {
                      var payload = [data, jqXHR.status, jqXHR.getAllResponseHeaders()];
                      
                      callback(null, payload);
                  })
                  .fail(function onFail (jqXHR) {
                      callback(jqXHR.status);
                  });
          }
    };
});