/* global define, $ */
define(function(require, exports, module) {
    var http_cache = require("../../lib/http_cache");
    
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
                    callback(null, [data, jqXHR.status, jqXHR.getAllResponseHeaders()]);
                })
                .fail(function onFail (jqXHR) {
                    callback(jqXHR.status)
                });
        },
        post: function(url, options, callback) {
            request('POST', url, options)
                .done(function onDone (data, status, jqXHR) {
                    callback(null, [data, jqXHR.status, jqXHR.getAllResponseHeaders()]);
                })
                .fail(function onFail (jqXHR) {
                    callback(jqXHR.status);
                });
        },
        put: function(url, options, callback) {
             request('PUT', url, options)
                 .done(function onDone (data, status, jqXHR) {
                     callback(null, [data, jqXHR.status, jqXHR.getAllResponseHeaders()]);
                 })
                 .fail(function onFail (jqXHR) {
                     callback(jqXHR.status);
                 });
         },
         del: function(url, options, callback) {
              request('DELETE', url, options)
                  .done(function onDone (data, status, jqXHR) {
                      callback(null, [data, jqXHR.status, jqXHR.getAllResponseHeaders()]);
                  })
                  .fail(function onFail (jqXHR) {
                      callback(jqXHR.status);
                  });
          }
    };
});