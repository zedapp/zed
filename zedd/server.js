#!/usr/bin/env node

/**  Usage: node server.js [rootPath] [port]
 *    rootPath defaults to $HOME
 *    port defaults to 1338
 */

var http = require("http");
var pathlib = require("path");
var urllib = require("url");
var fs = require("fs");
var qs = require("querystring");
var mkdirp = require("mkdirp");
var mime = require("mime");
var auth = require("basic-auth");
var nconf = require("nconf");

var config = nconf.argv().env().file(process.env.HOME + "/.zeddrc").defaults({
    port: 7337,
    ip: "0.0.0.0",
    root: process.env.HOME
});

var ROOT = pathlib.resolve(config.get("root"));

var webfs = {
    error: function(res, code, message) {
        res.writeHead(code, {
            "Content-Type": "text/plain"
        });
        res.write(code + " " + message);
        res.end();
    },
    sendEtagHeader: function(res, stat) {
        res.setHeader("ETag", stat.mtime.getTime());
    },
    doGET: function(req, res, filePath) {
        fs.stat(filePath, function(err, stat) {
            if (err) {
                return webfs.error(res, 404, "Path not found");
            }

            res.statusCode = 200;
            webfs.sendEtagHeader(res, stat);
            if (stat.isDirectory()) {
                res.setHeader('Content-Type', 'text/plain');
                fs.readdir(filePath, function(err, list) {
                    list = list.forEach(function(name) {
                        try {
                            var stat = fs.statSync(filePath + "/" + name);
                            if (stat.isDirectory()) {
                                res.write(name + "/\n");
                            } else {
                                res.write(name + "\n");
                            }
                        } catch (e) {
                            // Broken symlink or something, ignore
                        }
                    });
                    res.end();
                });
            } else { // File
                res.setHeader('Content-Length', stat.size);
                res.setHeader('Content-Type', mime.lookup(filePath));
                var stream = fs.createReadStream(filePath);
                stream.on('error', function(err) {
                    console.error("Error while reading", err);
                });
                stream.pipe(res);
            }

        });
    },
    doHEAD: function(req, res, filePath) {
        fs.stat(filePath, function(err, stat) {
            if (err) {
                return webfs.error(res, 404, "Path not found");
            }

            res.statusCode = 200;
            webfs.sendEtagHeader(res, stat);
            res.setHeader("Content-Length", "0");
            res.end("");
        });
    },
    doPUT: function(req, res, filePath) {
        // TODO: Make this streaming (and in that case: write to temp file first)
        var chunks = [];

        req.on("data", function(chunk) {
            chunks.push(chunk);
        });
        req.on("error", function() {
            webfs.error(res, 500, "Could't save file");
        });
        req.on("end", function() {
            var parentDir = pathlib.dirname(filePath);
            mkdirp(parentDir, function(err) {
                if (err) {
                    return webfs.error(res, 500, "Could't create parent directory");
                }
                var f = fs.createWriteStream(filePath);
                f.on('error', function() {
                    webfs.error(res, 500, "Couldn't write to file");
                });
                // Flush out all chunks
                for (var i = 0; i < chunks.length; i++) {
                    f.write(chunks[i]);
                }
                f.end();
                f.on('finish', function() {
                    fs.stat(filePath, function(err, stat) {
                        if (err) {
                            return webfs.error(res, 404, "Path not found");
                        }

                        res.statusCode = 200;
                        webfs.sendEtagHeader(res, stat);
                        res.end("OK");
                    });
                });
            });
        });
    },
    doDELETE: function(req, res, filePath) {
        fs.stat(filePath, function(err) {
            if (err) {
                return webfs.error(res, 404, "File not found");
            }

            fs.unlink(filePath, function(err) {
                if (err) {
                    return webfs.error(res, 404, "Unable to remove file");
                }
                res.statusCode = 200;
                res.end("OK");
            });
        });
    },
    doPOST: function(req, res, filePath) {
        postRequest(req, res, function() {
            console.log(res.post);
            var action = res.post && res.post.action;
            switch (action) {
                case "filelist":
                    res.writeHead(200, "OK", {
                        'Content-Type': 'text/plain'
                    });
                    fileList(filePath, res, function() {
                        console.log("fileList done");
                        res.end();
                    });
                    break;
                case "version":
                    res.writeHead(200, "OK", {
                        'Content-Type': 'text/plain'
                    });
                    res.end("1.0");
                    break;
                default:
                    return webfs.error(res, 404, "Unable to perform action: " + action);
            }
        });
    }
};

http.createServer(function(req, res) {
    var filePath = decodeURIComponent(urllib.parse(req.url).path);
    if(config.get("user")) {
        var user = auth(req);
        if(!user || user.name !== config.get("user") || user.pass !== config.get("password")) {
            res.writeHead(401, {
              'WWW-Authenticate': 'Basic realm="Zed daemon"'
            });
            return res.end();
        }
    }
    console.log(req.method, filePath);
    filePath = pathlib.join(ROOT, filePath);

    if (filePath.lastIndexOf(ROOT, 0) !== 0) {
        return webfs.error(res, 500, "Hacker attempt?");
    }

    var method = "do" + req.method;
    if (webfs[method]) {
        webfs[method](req, res, filePath);
    } else {
        webfs.error(res, 500, "Unknown request type");
    }
}).listen(config.get("port"), config.get("ip"));

console.log(
    "zedd started listening on port", config.get("port"),
    "\nExposing filesystem:", ROOT, (config.get("user") ?
        "\nWith authentication enabled." :
        "\nWith authentication DISABLED."));


function postRequest(req, res, cb) {
    var queryData = "";
    req.on('data', function(data) {
        queryData += data;
        if (queryData.length > 1e6) {
            res = "";
            res.writeHead(413, {
                'Content-Type': 'text/plain'
            });
            req.connection.destroy();
        }
    });
    req.on('end', function() {
        res.post = qs.parse(queryData);
        cb();
    });
}

function fileList(root, stream, callback) {
    var stop = false;

    stream.on("error", function() {
        stop = true;
    });
    stream.on("close", function() {
        stop = true;
    });
    walk("", function(err) {
        if (err) {
            return webfs.error(stream, 500, err.message);
        }
        callback();
    });

    function walk(dir, callback) {
        if (stop) {
            return callback();
        }
        fs.readdir(root + dir, function(err, list) {
            if (err) {
                return callback(err);
            }
            var pending = list.length;
            if (pending === 0) {
                return callback(null);
            }
            list.forEach(function(name) {
                if (name === "." || name === "..") {
                    return checkDone();
                }
                var file = dir + '/' + name;
                fs.stat(root + file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        walk(file, function() {
                            checkDone();
                        });
                    } else if (stat && stat.isFile()) {
                        stream.write(dir + '/' + name + "\n");
                        checkDone();
                    } else {
                        // !stat
                        checkDone();
                    }
                });
            });

            function checkDone() {
                if (!--pending) {
                    callback();
                }
            }
        });
    }
}
