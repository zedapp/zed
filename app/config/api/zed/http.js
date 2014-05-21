/* global sandboxRequest*/
module.exports = {
    fetchUrl: function(url) {
        return sandboxRequest("zed/http", "fetchUrl", [url]);
    },
    get: function(url, type) {
        return sandboxRequest("zed/http", "get", [url, type]);
    },

    /**
     * Sends a HTTP POST request to the given URL.
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
     *     type: {String} (optional; default = Intelligent Guess)
     * 
     *          The type of data expected from the server.
     * 
     * @param {String} url The respective endpoint.
     * @param {Object} options The configuration object.
     * 
     */
    post: function(url, options) {
        return sandboxRequest("zed/http", "post", [url, options]);
    },
    put: function(url, options) {
        return sandboxRequest("zed/http", "put", [url, options]);
    },
    del: function(url, options) {
        return sandboxRequest("zed/http", "del", [url, options]);
    }
};
