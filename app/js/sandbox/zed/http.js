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
    function request(verb, url, options) {
        return new Promise(function(resolve, reject) {
            var args = {};

            options = options || {};
            args.url = url;
            args.type = verb;
            args.headers = options.headers;
            args.data = options.data;
            args.dataType = options.dataType;

            $.ajax(args)
                .done(function onDone(data, status, jqXHR) {
                var payload = [
                data,
                jqXHR.status,
                convertResponseHeaders(jqXHR.getAllResponseHeaders())];

                resolve(payload);
            })
                .fail(function onFail(jqXHR) {
                reject(jqXHR.status)
            });
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

        source.forEach(function onEntry(header) {
            var position = header.indexOf(':');
            var key = header.substr(0, position);
            var value = header.substr(position + 1).trim();

            headers[key] = value;
        });

        return headers;
    }

    return {
        fetchUrl: function(url) {
            return http_cache.fetchUrl(url, {});
        },
        get: function(url, type) {
            var options = {
                dataType: type
            };

            return request('GET', url, options);
        },
        post: function(url, options) {
            return request('POST', url, options);
        },
        put: function(url, options) {
            return request('PUT', url, options);
        },
        del: function(url, options) {
            return request('DELETE', url, options);
        },

        startServer: function(id, requestHandlerCommand) {
            var edit = zed.getService("editor").getActiveEditor();
            var session = edit.session;
            var command = zed.getService("command");
            return zed.getService("webservers").startServer(id, function(req, res) {
                session.$cmdInfo = {
                    request: {
                        method: req.method,
                        path: req.path,
                        headers: req.headers,
                        query: req.query,
                        body: req.body,
                    }
                };

                // console.log("Calling", requestHandlerCommand, "to handle http");
                command.exec(requestHandlerCommand, edit, session).then(function(resp) {
                    // console.log("Got back from command", requestHandlerCommand, resp);
                    res.status(resp.status || 200);
                    _.each(resp.headers || {}, function(val, name) {
                        res.set(name, val);
                    });
                    res.send(resp.body || "");
                }).catch(function(err) {
                    console.error("Something went wrong while handling request:", err);
                });
            });
        },

        stopServer: function(id) {
            return zed.getService("webservers").stopServer(id);
        }
    };
});
