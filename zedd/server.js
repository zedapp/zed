#!/usr/bin/env node

var http = require("http");
var https = require("https");
var pathlib = require("path");
var urllib = require("url");
var fs = require("fs");
var qs = require("querystring");
var mkdirp = require("mkdirp");
var mime = require("mime");
var auth = require("basic-auth");
var nconf = require("nconf");
var spawn = require("child_process").spawn;

/**
 * Options:
 * - user
 * - pass
 * - port
 * - remote
 * - enable-run
 * - root
 * - tls-key
 * - tls-cert
 */

var config = nconf.argv().env().file(process.env.HOME + "/.zeddrc").defaults({
    port: 7337,
    ip: "0.0.0.0",
    root: process.env.HOME
});

if (!config.get("user") && config.get("ip") === "0.0.0.0") {
    config.set("ip", "127.0.0.1");
}

var ROOT = pathlib.resolve(config.get("root"));
var enableRun = !config.get("remote") || config.get("enable-run");

switch (process.argv[2]) {
    case "--help":
        help();
        break;
    case "--version":
        version();
        break;
    default:
        start();
}

function help() {
    console.log("Zedd is the Zed daemon used to edit files either locally or remotely using Zed.");
    console.log("Options can be passed in either as environment variables, JSON config in");
    console.log("~/.zeddrc or as command line arguments prefixed with '--':");
    console.log();
    console.log("   user:     username to use for authentication (default: none)");
    console.log("   pass:     password to use for authentication (default: none)");
    console.log("   remote:   bind to 0.0.0.0, requires auth, and disables");
    console.log("             enable-run by default");
    console.log("   port:     port to bind to (default: 7337)");
    console.log("   root:     root directory to expose (default: $HOME)");
    console.log("   tls-key:  path to TLS key file (enables https)");
    console.log("   tls-cert: path to TLS certificate file (enables https)");
    console.log();
}

function version() {
    console.log("Zedd version 1.0");
}

function error(res, code, message) {
    res.writeHead(code, {
        "Content-Type": "text/plain"
    });
    res.write(code + " " + message);
    res.end();
}

function sendEtagHeader(res, stat) {
    res.setHeader("ETag", stat.mtime.getTime());
}

function doGet(req, res, filePath) {
    fs.stat(filePath, function(err, stat) {
        if (err) {
            return error(res, 404, "Path not found");
        }

        res.statusCode = 200;
        sendEtagHeader(res, stat);
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
}

function doHead(req, res, filePath) {
    fs.stat(filePath, function(err, stat) {
        if (err) {
            return error(res, 404, "Path not found");
        }

        res.statusCode = 200;
        sendEtagHeader(res, stat);
        res.setHeader("Content-Length", "0");
        res.end("");
    });
}

function doPut(req, res, filePath) {
    // TODO: Make this streaming (and in that case: write to temp file first)
    var chunks = [];

    req.on("data", function(chunk) {
        chunks.push(chunk);
    });
    req.on("error", function() {
        error(res, 500, "Could't save file");
    });
    req.on("end", function() {
        var parentDir = pathlib.dirname(filePath);
        mkdirp(parentDir, function(err) {
            if (err) {
                return error(res, 500, "Could't create parent directory");
            }
            var f = fs.createWriteStream(filePath);
            f.on('error', function() {
                error(res, 500, "Couldn't write to file");
            });
            // Flush out all chunks
            for (var i = 0; i < chunks.length; i++) {
                f.write(chunks[i]);
            }
            f.end();
            f.on('finish', function() {
                fs.stat(filePath, function(err, stat) {
                    if (err) {
                        return error(res, 404, "Path not found");
                    }

                    res.statusCode = 200;
                    sendEtagHeader(res, stat);
                    res.end("OK");
                });
            });
        });
    });
}

function doDelete(req, res, filePath) {
    fs.stat(filePath, function(err) {
        if (err) {
            return error(res, 404, "File not found");
        }

        fs.unlink(filePath, function(err) {
            if (err) {
                return error(res, 404, "Unable to remove file");
            }
            res.statusCode = 200;
            res.end("OK");
        });
    });
}

function doPost(req, res, filePath) {
    bufferPostRequest(req, res, function() {
        var action = res.post && res.post.action;
        switch (action) {
            case "filelist":
                res.writeHead(200, "OK", {
                    'Content-Type': 'text/plain'
                });
                fileList(filePath, res);
                break;
            case "run":
                if (!enableRun) {
                    return error(res, 403, "Run is disabled");
                }
                runCommand(filePath, res);
                break;
            case "version":
                res.writeHead(200, "OK", {
                    'Content-Type': 'text/plain'
                });
                res.end("1.1");
                break;
            case "capabilities":
                res.writeHead(200, "OK", {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    run: !!enableRun
                }));
                break;
            default:
                return error(res, 404, "Unable to perform action: " + action);
        }
    });
}

function requestHandler(req, res) {
    var filePath = decodeURIComponent(urllib.parse(req.url).path);
    if (config.get("user")) {
        var user = auth(req);
        if (!user || user.name !== config.get("user") || user.pass !== config.get("pass")) {
            res.writeHead(401, {
                'WWW-Authenticate': 'Basic realm="Zed daemon"'
            });
            return res.end();
        }
    }
    console.log(req.method, filePath);
    filePath = pathlib.normalize(pathlib.join(ROOT, filePath));

    if (filePath.indexOf(ROOT) !== 0) {
        return error(res, 500, "Hack attempt?");
    }

    switch (req.method) {
        case "GET":
            return doGet(req, res, filePath);
        case "HEAD":
            return doHead(req, res, filePath);
        case "PUT":
            return doPut(req, res, filePath);
        case "POST":
            return doPost(req, res, filePath);
        case "DELETE":
            return doDelete(req, res, filePath);
        default:
            return error(res, 500, "Unknown request type");
    }
}

function start() {
    var server, isSecure;
    var bindIp = config.get("remote") ? "0.0.0.0" : "127.0.0.1";
    var bindPort = config.get("port");
    if (config.get("remote") && !config.get("user")) {
        console.error("In remote mode, --user and --pass need to be specified.");
        process.exit(1);
    }
    if (config.get("tls-key") && config.get("tls-cert")) {
        server = https.createServer({
            key: fs.readFileSync(config.get("tls-key")),
            cert: fs.readFileSync(config.get("tls-cert"))
        }, requestHandler);
        isSecure = true;
    } else {
        server = http.createServer(requestHandler);
        isSecure = false;
    }
    server.listen(bindPort, bindIp);
    server.on("error", function() {
        console.error("ERROR: Could not listen on port", bindPort, "is zedd already running?");
        process.exit(2);
    });
    console.log(
        "Zedd is now listening on " + (isSecure ? "https" : "http") + "://" + bindIp + ":" + bindPort,
        "\nExposed filesystem :", ROOT,
        "\nMode               :", config.get("remote") ? "remote (externally accessible)" : "local",
        "\nCommand execution  :", enableRun ? "enabled" : "disabled",
        "\nAuthentication     :", config.get("user") ? "enabled" : "disabled");
}


function bufferPostRequest(req, res, callback) {
    var queryData = "";
    req.on("data", function(data) {
        queryData += data;
        if (queryData.length > 1e6) {
            queryData = "";
            res.writeHead(413, {
                "Content-Type": "text/plain"
            });
            req.connection.destroy();
        }
    });
    req.on("end", function() {
        res.post = qs.parse(queryData);
        callback();
    });
}

function fileList(root, res) {
    var stop = false;

    res.on("error", function() {
        stop = true;
    });
    res.on("close", function() {
        stop = true;
    });
    walk("", function(err) {
        if (err) {
            return error(res, 500, err.message);
        }
        res.end();
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
                        res.write(dir + '/' + name + "\n");
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

function runCommand(root, res) {
    var command = res.post.command;
    if (!command) {
        return error(res, 500, "No command specified");
    }
    try {
        command = JSON.parse(command);
    } catch (e) {
        return error(res, 500, "Could not parse command");
    }
    var p = spawn(command[0], command.slice(1), {
        cwd: root,
        env: process.env
    });
    res.on("error", function() {
        console.log("Killing sub process", command[0]);
        p.kill();
    });
    res.on("close", function() {
        console.log("Killing sub process", command[0]);
        p.kill();
    });
    if (res.post.stdin) {
        p.stdin.end(res.post.stdin);
    }
    p.stdout.pipe(res);
    p.stderr.pipe(res);
    p.on("close", function() {
        res.end();
    });
    p.on("error", function(err) {
        console.error("Run error", err);
    });
}
