/* global define */
define(function(require, exports, module) {
    var http_cache = require("../../http_cache");
    
    return {
        fetchUrl: function(url, callback) {
            http_cache.fetchUrl(url, {}, callback);
        }
    };
});