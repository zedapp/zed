/* global define, sandboxRequest*/
define(function(require, exports, module) {
    return {
        fetchUrl: function(url, callback) {
            sandboxRequest("zed/http", "fetchUrl", [url], callback);
        }
    };
});