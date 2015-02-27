/**
 * Implements a web server in node-webkit
 */
define(function(require, exports, module) {
    return function() {
        var express = nodeRequire("express");
        var bodyParser = nodeRequire("body-parser");
        var http = nodeRequire("http");

        function HttpServer(host, port, requestHandler) {
            this.host = host;
            this.port = port;

            this.app = express();
            this.app.use(bodyParser.text({
                defaultCharset: "binary"
            }));
            this.app.all('*', function(req, res) {
                var oldSend = res.send;
                res.send = function(data) {
                    var buf = new Buffer(data, 'binary');
                    oldSend.call(res, buf);
                };
                requestHandler(req, res);
            });
        }

        HttpServer.prototype = {
            start: function() {
                var server = this;
                return new Promise(function(resolve, reject) {
                    console.log("Going to start server now");
                    server.$server = http.createServer(server.app);
                    server.$server.on('error', function(err) {
                        reject(err);
                    });
                    server.$server.listen(server.port, server.host, function() {
                        resolve();
                    });
                });
            },
            stop: function() {
                if (this.$server) {
                    this.$server.close();
                    this.$server = null;
                }
            },
        };

        return {
            HttpServer: HttpServer
        };
    };
});
