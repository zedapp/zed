/* global sandboxRequest*/
module.exports = {
    fetchUrl: function(url, callback) {
        sandboxRequest("zed/http", "fetchUrl", [url], callback);
    },
    get: function(url, type, callback) {
        sandboxRequest("zed/http", "get", [url, type], callback);
    }
};
