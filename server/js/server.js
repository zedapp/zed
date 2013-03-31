#!/usr/bin/env node

/**  Usage: node server.js [rootPath] [port]
 *    rootPath defaults to $HOME
 *    port defaults to 1338
 */

var http = require("http");
var pathlib = require("path");
var urllib = require("url");
var fs = require("fs");
var qs = require('querystring');
var mkdirp = require('mkdirp');

var PORT = process.env.PORT || 1338;
var IP = process.env.IP || "0.0.0.0";
var ROOT = process.env.HOME;


var arg = process.argv.slice(2);
if (arg[0] && !arg[1] && /^\d+$/.test(arg[0])) {
    arg[1] = arg[0];
    arg[0] = "";
}

if (arg[0])
    ROOT = arg[0];
if (arg[1])
    PORT = parseInt(arg[1]);

ROOT = pathlib.resolve(ROOT);


var webfs = {
    error: function(res, code, message) {
        res.writeHead(code, {"Content-Type": "text/plain"});
        res.write(code + " " + message);
        res.end();
    },
    sendEtagHeader: function(res, stat) {
        res.setHeader("ETag", stat.mtime.getTime());
    },
    doGET: function(req, res, filePath) {
        fs.stat(filePath, function(err, stat){
            if (err)
                return webfs.error(res, 404, "Path not found");

            res.statusCode = 200;
            webfs.sendEtagHeader(res, stat);
            if (stat.isDirectory()) {
                res.setHeader('Content-type', 'text/plain');
                fs.readdir(filePath, function(err, list) {
                    list = list.map(function(name) {
                        var stat = fs.statSync(filePath + "/" + name);
                        if (stat.isDirectory())
                            return name + "/";
                        else
                            return name;
                    });
                    res.end(list.join("\n"));
                });
                return;
            }

            res.setHeader('Content-Length', stat.size);
            var stream = fs.createReadStream(filePath, {});
            stream.pipe(res);
        });
    },
    doOPTIONS: function(req, res, filePath) {
        fs.stat(filePath, function(err, stat){
            if (err)
                return webfs.error(res, 404, "Path not found");

            res.statusCode = 200;
            webfs.sendEtagHeader(res, stat);
            res.end("");
        });
    },
    doPUT: function(req, res, filePath) {
        var data = "";
        req.on("data", function(chunk) {
            data += chunk;
        });
        req.on("error", function() {
            webfs.error(res, 404, "Could't save file");
        });
        req.on("end", function() {
            var parentDir = pathlib.dirname(filePath);
            mkdirp(parentDir, function(err, made) {
                try {
                    fs.writeFileSync(filePath, data);                    
                } catch(e) {
                    console.log(e);
                    return webfs.error(res, 404, "Could't save file");
                }
                fs.stat(filePath, function(err, stat){
                    if (err)
                        return webfs.error(res, 404, "Path not found");
    
                    res.statusCode = 200;
                    webfs.sendEtagHeader(res, stat);
                    res.end("OK");
                });
            });
        });
    },
    doDELETE: function(req, res, filePath) {
        fs.stat(filePath, function(err, stat){
            if (err)
                return webfs.error(res, 404, "File not found");

            fs.unlink(filePath, function(err){
                if (err)
                    return webfs.error(res, 404, "Unable to remove file");
                res.statusCode = 200;
                res.end("OK");
            });
        });
    },
    doPOST: function(req, res, filePath) {
        postRequest(req, res, function() {
            var action = res.post && res.post.action;
            if (action == "filelist") {
                res.writeHead(200, "OK", {'Content-Type': 'text/plain'});
                fileList(filePath, function(lines) {
                    res.write(lines);
                }, function() {
                    console.log("fileList done");
                    res.end();
                });
            } else {
                return webfs.error(res, 404, "Unable to remove file");
            }
        });
    }
};

http.createServer(function(req, res) {
    var filePath = decodeURIComponent(urllib.parse(req.url).path);
    console.log(req.method, filePath);
    filePath = pathlib.join(ROOT, filePath);

    if (filePath.lastIndexOf(ROOT, 0) != 0)
        return webfs.error(res, 500, "Hacker attempt?");

    var method = "do" + req.method;
    if (webfs[method]) {
        webfs[method](req, res, filePath);
    } else {
        webfs.error(res, 500, "Unknown request type");
    }
}).listen(PORT, IP);

console.log(
    "Started WebFS server listening at http://"+ IP + ":" + PORT,
    "\nExposing filesystem:", ROOT
);


function postRequest(req, res, cb) {
    var queryData = "";
    req.on('data', function(data) {
        queryData += data;
        if (queryData.length > 1e6) {
            res = "";
            res.writeHead(413, {'Content-Type': 'text/plain'});
            req.connection.destroy();
        }
    });
    req.on('end', function() {
        res.post = qs.parse(queryData);
        cb();
    });
}

function fileList(root, ptint, end) {
    var cache = "";
    var count = 0;
    var walk = function(dir, done) {
        fs.readdir(root + dir, function(err, list) {
            if (err) return done(err);
            var pending = list.length;
            if (!pending) return done(null);
            list.forEach(function(name) {
                if (name[0] == ".") {
                    if (!--pending) done();
                    return;
                }
                var file = dir + '/' + name;
                fs.stat(root + file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        walk(file, function() {
                            if (!--pending) done();
                        });
                    } else if (stat && stat.isFile()) {
                        cache += (dir + '/' + name + "\n");
                        if (count++ > 500) {
                            ptint(cache);
                            cache = "";
                            count = 0;
                        }
                        if (!--pending) done();
                    }
                });
            });
        });
    };
    walk("", function() {
        cache && ptint(cache);
        end();
    });
}
