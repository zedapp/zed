/* global sandboxRequest*/
module.exports = {
    fetchUrl: function(url) {
        return sandboxRequest("zed/http", "fetchUrl", [url]);
    },
    get: function(url, type) {
        return sandboxRequest("zed/http", "get", [url, type]);
    },
    post: function(url, options) {
        return sandboxRequest("zed/http", "post", [url, options]);
    }
};
