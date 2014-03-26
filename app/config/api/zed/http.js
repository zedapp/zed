/* global sandboxRequest*/
module.exports = {
    fetchUrl: function(url, callback) {
        return sandboxRequest("zed/http", "fetchUrl", [url]);
    },
    get: function(url, type, callback) {
        return sandboxRequest("zed/http", "get", [url, type]);
    }
};
