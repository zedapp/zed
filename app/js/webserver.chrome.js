/**
 * Implements a web server in Chrome
 */
define(function(require, exports, module) {
    plugin.consumes = ["fs", "eventbus"];
    plugin.provides = ["webserver"];
    return plugin;

    function plugin(options, imports, register) {
        var fs = imports.fs;
        var eventbus = imports.eventbus;

        var fsUtil = require("./fs/util");
        var pathUtil = require("./lib/path");
        var mimeTypes = require("./lib/mime_types");

        var prefix = "/out";

        function getContentType(path) {
            var ext = pathUtil.ext(path);
            return mimeTypes[ext] || "application/octet-stream";
        }

        var socketInfo, requestHandler;

        function HttpRequest(method, requestUri, headers, body) {
            var request = this;
            this.method = method;
            this.headers = headers;

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

            this.body = body;

        }

        function HttpResponse(socketId) {
            this.socketId = socketId;
            this.status = "200 OK";
            this.headers = {};
        }

        HttpResponse.prototype = {
            setHeader: function(header, value) {
                this.headers[header] = value;
            },
            setStatus: function(code) {
                this.status = code;
            },
            send: function(data) {
                var response = this;
                var responseString = "HTTP/1.0 " + this.status + "\n";
                this.headers["Content-Length"] = data.length;
                for (var header in this.headers) {
                    responseString += header + ": " + this.headers[header] + "\n";
                }
                responseString += "\n";
                var headerBuffer = fsUtil.binaryStringAsUint8Array(responseString);
                var outputBuffer = new ArrayBuffer(headerBuffer.byteLength + data.length);
                var view = new Uint8Array(outputBuffer);
                view.set(headerBuffer, 0);
                view.set(fsUtil.binaryStringAsUint8Array(data), header.byteLength);

                chrome.socket.write(response.socketId, outputBuffer, function(writeInfo) {
                    // console.log("WRITE", writeInfo);
                    chrome.socket.destroy(response.socketId);
                    chrome.socket.accept(socketInfo.socketId, onAccept);
                });
            }
        };

        requestHandler = function(req, res) {
            var path = req.path;
            console.log("Request", req);
            fs.readFile(prefix + path, true).then(function(content) {
                res.setStatus("200 OK");
                res.setHeader("Content-Type", getContentType(path));
                res.send(content);
            }, function() {
                // We'll assume a not found error. Let's try one more thing: adding /index.html to the end
                if (path[path.length - 1] === "/") {
                    path = path.substring(0, path.length - 1);
                }
                fs.readFile(prefix + path + "/index.html", true).then(function(content) {
                    res.setStatus("200 OK");
                    res.setHeader("Content-Type", "text/html");
                    res.send(content);
                }, function() {
                    res.setStatus("404 Not Found");
                    res.setHeader("Content-Type", "text/plain");
                    res.send("Not found");
                });
            });
        };

        function arrayBufferToString(buffer) {
            return fsUtil.uint8ArrayToBinaryString(new Uint8Array(buffer));
        }

        function onAccept(acceptInfo) {
            readFromSocket(acceptInfo.socketId);
        }

        function readFromSocket(socketId) {
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
                    var response = new HttpResponse(socketId);
                    requestHandler(request, response);
                } catch (err) {
                    console.error("Exception occurred", err.message, err.stack);
                }
            });
        }

        function startServer(port) {
            chrome.socket.create("tcp", {}, function(_socketInfo) {
                socketInfo = _socketInfo;
                chrome.socket.listen(socketInfo.socketId, "127.0.0.1", port, 50, function(result) {
                    if (result !== 0) {
                        // Port not available, probably try the next one
                        startServer(port + 1);
                    }
                    console.log("Server listening on port", port);
                    chrome.socket.accept(socketInfo.socketId, onAccept);
                });
            });
        }

        function stopServer() {
            if(socketInfo) {
                chrome.socket.destroy(socketInfo.socketId);
                socketInfo = null;
            }
        }


        var api = {
            hook: function() {
                eventbus.on("windowclose", stopServer);
            },
            init: function() {
                // startServer(8081);
            },
            startServer: startServer,
            stopServer: stopServer
        };

        return register(null, {
            webserver: api
        });
    }
});
