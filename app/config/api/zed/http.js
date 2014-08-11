/* global sandboxRequest*/
module.exports = {

    /**
     * HTTP API
     *
     * Provides functions for performing HTTP requests.
     *
     * Usage example:
     *
     *     var http = require('zed/http');
     *
     *     http.post('http://host.tld', {
     *         headers: {},
     *         data: {},
     *         type: 'application/json'
     *     }).then(function onSuccess (response) {
     *         var body = response[0];
     *         var status = response[1];
     *         var headers = response[2];
     *     }, function onFail (status) {
     *
     *     });
     *
     */
    fetchUrl: function(url) {
        return sandboxRequest("zed/http", "fetchUrl", [url]);
    },

    /**
     * Sends a HTTP GET request to the given URL.
     *
     * @param {String} url The respective endpoint.
     * @param {Object} type The type of data expected from the server.
     *
     */
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

    /**
     * Sends a HTTP PUT request to the given URL.
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
    put: function(url, options) {
        return sandboxRequest("zed/http", "put", [url, options]);
    },

    /**
     * Sends a HTTP DELETE request to the given URL.
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
    del: function(url, options) {
        return sandboxRequest("zed/http", "del", [url, options]);
    },

    startServer: function(id, requestHandlerCommand) {
        return sandboxRequest("zed/http", "startServer", [id, requestHandlerCommand]);
    },

    stopServer: function(id) {
        return sandboxRequest("zed/http", "stopServer", [id]);
    }
};
