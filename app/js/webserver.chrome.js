/**
 * Implements a web server in Chrome
 */
define(function(require, exports, module) {
    plugin.consumes = ["fs", "eventbus"];
    plugin.provides = ["webserver"];
    return plugin;

    function plugin(options, imports, register) {
        var fsUtil = require("./fs/util");

        var STATUS_CODES = {
            100: 'Continue',
            101: 'Switching Protocols',
            102: 'Processing', // RFC 2518, obsoleted by RFC 4918
            200: 'OK',
            201: 'Created',
            202: 'Accepted',
            203: 'Non-Authoritative Information',
            204: 'No Content',
            205: 'Reset Content',
            206: 'Partial Content',
            207: 'Multi-Status', // RFC 4918
            300: 'Multiple Choices',
            301: 'Moved Permanently',
            302: 'Moved Temporarily',
            303: 'See Other',
            304: 'Not Modified',
            305: 'Use Proxy',
            307: 'Temporary Redirect',
            308: 'Permanent Redirect', // RFC 7238
            400: 'Bad Request',
            401: 'Unauthorized',
            402: 'Payment Required',
            403: 'Forbidden',
            404: 'Not Found',
            405: 'Method Not Allowed',
            406: 'Not Acceptable',
            407: 'Proxy Authentication Required',
            408: 'Request Time-out',
            409: 'Conflict',
            410: 'Gone',
            411: 'Length Required',
            412: 'Precondition Failed',
            413: 'Request Entity Too Large',
            414: 'Request-URI Too Large',
            415: 'Unsupported Media Type',
            416: 'Requested Range Not Satisfiable',
            417: 'Expectation Failed',
            418: 'I\'m a teapot', // RFC 2324
            422: 'Unprocessable Entity', // RFC 4918
            423: 'Locked', // RFC 4918
            424: 'Failed Dependency', // RFC 4918
            425: 'Unordered Collection', // RFC 4918
            426: 'Upgrade Required', // RFC 2817
            428: 'Precondition Required', // RFC 6585
            429: 'Too Many Requests', // RFC 6585
            431: 'Request Header Fields Too Large', // RFC 6585
            500: 'Internal Server Error',
            501: 'Not Implemented',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
            504: 'Gateway Time-out',
            505: 'HTTP Version Not Supported',
            506: 'Variant Also Negotiates', // RFC 2295
            507: 'Insufficient Storage', // RFC 4918
            509: 'Bandwidth Limit Exceeded',
            510: 'Not Extended', // RFC 2774
            511: 'Network Authentication Required' // RFC 6585
        };

        function HttpServer(host, port, requestHandler) {
            this.requestHandler = requestHandler;
            this.host = host;
            this.port = port;

            // bound version of $onAccept
            this.$$onAccept = this.$onAccept.bind(this);
        }

        HttpServer.prototype = {
            start: function() {
                var server = this;
                return new Promise(function(resolve, reject) {
                    chrome.socket.create("tcp", {}, function(_socketInfo) {
                        server.$socketInfo = _socketInfo;
                        chrome.socket.listen(server.$socketInfo.socketId, server.host || "127.0.0.1", server.port, 50, function(result) {
                            if (result !== 0) {
                                // Port not available, probably try the next one
                                return reject(result);
                            }
                            chrome.socket.accept(server.$socketInfo.socketId, server.$$onAccept);
                            console.log("Server listening on port", server.port);
                            resolve();
                        });
                    });
                });
            },
            stop: function() {
                if (this.$socketInfo) {
                    chrome.socket.destroy(this.$socketInfo.socketId);
                    this.$socketInfo = null;
                }
            },
            $onAccept: function(acceptInfo) {
                this.$readFromSocket(acceptInfo.socketId);
                // Immediately accept next request
                chrome.socket.accept(this.$socketInfo.socketId, this.$$onAccept);
            },
            $readFromSocket: function(socketId) {
                var server = this;
                chrome.socket.read(socketId, function(readInfo) {
                    var data = arrayBufferToString(readInfo.data);
                    try {
                        var spaceIndex = data.indexOf(" ");
                        var method = data.substring(0, spaceIndex);
                        // we can only deal with GET requests
                        var uriEnd = data.indexOf(" ", spaceIndex + 1);
                        if (uriEnd < 0) { /* throw a wobbler */
                            return;
                        }
                        var uri = data.substring(spaceIndex + 1, uriEnd);

                        var parts = data.split(/\n\r?\n\r?/);
                        var headerPart = parts[0];
                        var headers = {};
                        headerPart.split(/\n\r?/).slice(1).forEach(function(headerLine) {
                            var parts = headerLine.split(':');
                            if (parts.length === 2) {
                                headers[parts[0]] = parts[1];
                            }
                        });
                        var body = parts[1];

                        var request = new HttpRequest(method, uri, headers, body);
                        var response = new HttpResponse(server, socketId);
                        server.requestHandler(request, response);
                    } catch (err) {
                        console.error("Exception occurred", err.message, err.stack);
                    }
                });
            }
        };

        function HttpRequest(method, requestUri, headers, body) {
            var request = this;
            this.method = method;
            this.headers = headers;
            this.body = body;
            this.query = {};

            var q = requestUri.indexOf("?");
            if (q !== -1) {
                this.path = requestUri.substring(0, q);
                var queryString = requestUri.substring(q + 1);
                queryString.split("&").forEach(function(part) {
                    var spl = part.split('=');
                    request.query[spl[0]] = decodeURIComponent(spl[1]);
                });
            } else {
                this.path = requestUri;
            }


        }

        function HttpResponse(server, socketId) {
            this.socketId = socketId;
            this.$status = 200;
            this.headers = {};
            this.$server = server;
        }

        HttpResponse.prototype = {
            set: function(header, value) {
                this.headers[header] = value;
            },
            status: function(code) {
                this.$status = code;
            },
            send: function(data) {
                var response = this;
                var responseString = "HTTP/1.0 " + this.$status + " " + STATUS_CODES[this.$status] + "\n";
                this.headers["Content-Length"] = data.length;
                for (var header in this.headers) {
                    responseString += header + ": " + this.headers[header] + "\n";
                }
                responseString += "\n";

                var headerBuffer = fsUtil.binaryStringAsUint8Array(responseString);
                var outputBuffer = new ArrayBuffer(headerBuffer.byteLength + data.length);
                var view = new Uint8Array(outputBuffer);
                view.set(headerBuffer, 0);
                view.set(fsUtil.binaryStringAsUint8Array(data), headerBuffer.byteLength);

                chrome.socket.write(response.socketId, outputBuffer, function(writeInfo) {
                    // console.log("WRITE", writeInfo);
                    chrome.socket.destroy(response.socketId);
                });
            }
        };

        function arrayBufferToString(buffer) {
            return fsUtil.uint8ArrayToBinaryString(new Uint8Array(buffer));
        }

        var api = {
            HttpServer: HttpServer
        };

        return register(null, {
            webserver: api
        });
    }
});
