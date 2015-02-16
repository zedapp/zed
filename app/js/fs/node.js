/*global define, _, nodeRequire */
define(function(require, exports, module) {
    plugin.consumes = ["history"]
    plugin.provides = ["fs"];
    return plugin;

    function plugin(options, imports, register) {
        var async = require("../lib/async");
        var poll_watcher = require("./poll_watcher");
        var nodeFs = nodeRequire("fs");
        var path = nodeRequire("path");
        var spawn = nodeRequire("child_process").spawn;

        var history = imports.history;

        var rootPath = options.dir;
        var dontRegister = options.dontRegister;

        // Support opening a single file
        var stats = nodeFs.statSync(rootPath);
        var filename;
        if (stats.isFile()) {
            filename = path.basename(rootPath);
            rootPath = path.dirname(rootPath);
        }

        // Copy and paste from project.js, but cannot important that due to
        // recursive imports.
        function dirname(path) {
            if (path[path.length - 1] === '/') {
                path = path.substring(0, path.length - 1);
            }
            var parts = path.split("/");
            return parts.slice(0, parts.length - 1).join("/");
        }

        function stripRoot(filename) {
            return filename.substring(rootPath.length);
        }

        function addRoot(filename) {
            return rootPath + filename;
        }

        function mkdirs(path) {
            return new Promise(function(resolve, reject) {
                var parts = path.split("/");
                if (parts.length === 1) {
                    resolve();
                } else {
                    mkdirs(parts.slice(0, parts.length - 1).join("/")).then(function() {
                        nodeFs.exists(path, function(exists) {
                            if (exists) {
                                resolve();
                            } else {
                                nodeFs.mkdir(path, function(err) {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve(err);
                                    }
                                });
                            }
                        });
                    }, reject);
                }
            });
        }

        var api = {
            listFiles: function() {
                var files = [];

                return new Promise(function(resolve, reject) {
                    function readDir(dir, callback) {
                        nodeFs.readdir(dir, function(err, entries) {
                            if (err) {
                                return callback(err);
                            }
                            async.parForEach(entries, function(entry, next) {
                                // if (entry[0] === ".") {
                                //     return next();
                                // }
                                var fullPath = dir + "/" + entry;
                                nodeFs.stat(fullPath, function(err, stat) {
                                    if (err) {
                                        return next(err);
                                    }
                                    if (stat.isDirectory()) {
                                        readDir(fullPath, next);
                                    } else {
                                        files.push(fullPath);
                                        next();
                                    }
                                });
                            }, callback);
                        });
                    }
                    readDir(rootPath, function(err) {
                        if (err) {
                            return reject(err);
                        }
                        resolve(files.map(stripRoot));
                    });
                });

            },
            readFile: function(path, binary) {
                if (path === "/.zedstate" && filename) {
                    return Promise.resolve(JSON.stringify({
                        "session.current": ["/" + filename]
                    }));
                }
                var fullPath = addRoot(path);
                return new Promise(function(resolve, reject) {
                    nodeFs.readFile(fullPath, {
                        encoding: binary ? 'binary' : 'utf8'
                    }, function(err, contents) {
                        if (err) {
                            return reject(err);
                        }
                        nodeFs.stat(fullPath, function(err, stat) {
                            if (err) {
                                console.error("Readfile successful, but error during stat:", err);
                            }
                            watcher.setCacheTag(path, "" + stat.mtime);
                            resolve(contents);
                        });
                    });
                });
            },
            writeFile: function(path, content, binary) {
                if (path === "/.zedstate" && filename) {
                    return Promise.resolve();
                }
                var fullPath = addRoot(path);
                // First ensure parent dir exists
                return mkdirs(dirname(fullPath)).then(function() {
                    return new Promise(function(resolve, reject) {
                        nodeFs.writeFile(fullPath, content, {
                            encoding: binary ? 'binary' : 'utf8'
                        }, function(err) {
                            if (err) {
                                return reject(err);
                            }
                            nodeFs.stat(fullPath, function(err, stat) {
                                watcher.setCacheTag(path, "" + stat.mtime);
                                resolve();
                            });
                        });
                    });
                });
            },
            deleteFile: function(path) {
                var fullPath = addRoot(path);
                return new Promise(function(resolve, reject) {
                    nodeFs.unlink(fullPath, function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            },
            watchFile: function(path, callback) {
                watcher.watchFile(path, callback);
            },
            unwatchFile: function(path, callback) {
                watcher.unwatchFile(path, callback);
            },
            getCacheTag: function(path) {
                return new Promise(function(resolve, reject) {
                    nodeFs.stat(addRoot(path), function(err, stat) {
                        if (err) {
                            return reject(404);
                        }
                        resolve("" + stat.mtime);
                    });
                });
            },
            getCapabilities: function() {
                return {
                    run: true
                };
            },
            run: function(command, stdin) {
                return new Promise(function(resolve) {
                    var p = spawn(command[0], command.slice(1), {
                        cwd: rootPath,
                        env: process.env
                    });
                    var chunks = [];
                    if (stdin) {
                        p.stdin.end(stdin);
                    }
                    p.stdout.on("data", function(data) {
                        chunks.push(data);
                    });
                    p.stderr.on("data", function(data) {
                        chunks.push(data);
                    });
                    p.on("close", function() {
                        resolve(chunks.join(''));
                    });
                    p.on("error", function(err) {
                        // Not rejecting to be compatible with webfs implementation
                        resolve(chunks.join('') + err.message);
                    });
                });
            }
        };

        var watcher = poll_watcher(api, 3000);
        if (!dontRegister) {
            history.pushProject(options.dir, "node:" + options.dir);
        }
        register(null, {
            fs: api
        });
    }
});
