/**
 * This module implements a union fs, it will do fall-through for various operations
 * such as reads and writes, attempting them one by one until one succeeds.
 *
 * Note: currently unionfs overrides file watching behavior and does manual
 *       watching based on content.
 */
/* global _ */
define(function(require, exports, module) {
    plugin.provides = ["fs"];
    return plugin;

    function plugin(options, imports, register) {
        var async = require("../lib/async");
        var poll_watcher = require("./poll_watcher");
        var fileSystems = options.fileSystems;
        var watchSelf = options.watchSelf;

        /**
         * @param options:
         *    - watchSelf: emit change events on things written by this fs
         */
        function attempt(fnName, args) {
            var index = 0;

            function attemptOne() {
                return fileSystems[index][fnName].apply(fileSystems[index], args).catch(function(err) {
                    index++;
                    if (index >= fileSystems.length) {
                        return Promise.reject(err);
                    } else {
                        return attemptOne();
                    }
                });
            }
            return attemptOne();
        }


        var api = {
            listFiles: function() {
                var files = [];
                return Promise.all(fileSystems.map(function(fs) {
                    return fs.listFiles().then(function(files_) {
                        files_.forEach(function(filename) {
                            if (files.indexOf(filename) === -1) {
                                files.push(filename);
                            }
                        });
                    }, function(err) {
                        console.error("Got error from filesystem", fs, err);
                    });
                })).then(function() {
                    return files;
                });
            },
            readFile: function(path, binary) {
                return attempt("readFile", [path, binary]).then(function(d) {
                    api.getCacheTag(path).then(function(tag) {
                        watcher.setCacheTag(path, tag);
                    });
                    return d;
                });
            },
            writeFile: function(path, content, binary) {
                return attempt("writeFile", [path, content, binary]).then(function() {
                    if (!watchSelf) {
                        api.getCacheTag(path).then(function(tag) {
                            watcher.setCacheTag(path, tag);
                        });
                    }
                });
            },
            deleteFile: function(path) {
                return attempt("deleteFile", [path]);
            },
            watchFile: function(path, callback) {
                watcher.watchFile(path, callback);
            },
            unwatchFile: function(path, callback) {
                watcher.unwatchFile(path, callback);
            },
            getCacheTag: function(path) {
                return attempt("getCacheTag", [path]);
            },
            getCapabilities: function() {
                return {};
            }
        };

        var watcher = poll_watcher(api, 2000);

        register(null, {
            fs: api
        });
    }
});
