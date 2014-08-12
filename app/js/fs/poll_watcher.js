define(function(require, exports, module) {
    return function(fs, pollInterval) {
        var tagCache = {};
        var fileWatchers = {};
        var fileLocks = {};

        var LOCK_TIMEOUT = 30 * 1000; // 30 seconds

        function pollFiles() {
            Object.keys(fileWatchers).forEach(function(path) {
                // If nobody's listening, let's not poll
                if (fileWatchers[path].length === 0) {
                    return;
                }

                // If the file is locked (e.g. write going on), let's not poll
                if (fileLocks[path] && fileLocks[path] > Date.now() - LOCK_TIMEOUT) {
                    return;
                }

                fs.getCacheTag(path).then(function(tag) {
                    if (tagCache[path] !== tag) {
                        fileWatchers[path].forEach(function(fn) {
                            fn(path, "changed");
                        });
                        tagCache[path] = tag;
                    }
                }, function(err) {
                    delete tagCache[path];
                    if (err === 404) {
                        fileWatchers[path].forEach(function(fn) {
                            fn(path, "deleted");
                        });
                        delete fileWatchers[path];
                    } else if (err === 410) {
                        fileWatchers[path].forEach(function(fn) {
                            fn(path, "disconnected");
                        });
                    } else {
                        fileWatchers[path].forEach(function(fn) {
                            fn(path, "error");
                        });
                    }
                });
            });
        }

        setInterval(pollFiles, pollInterval);

        return {
            watchFile: function(path, callback) {
                fileWatchers[path] = fileWatchers[path] || [];
                fileWatchers[path].push(callback);
            },
            unwatchFile: function(path, callback) {
                if (!fileWatchers[path]) {
                    return;
                }
                fileWatchers[path].splice(fileWatchers[path].indexOf(callback), 1);
            },
            setCacheTag: function(path, tag) {
                tagCache[path] = tag;
            },
            clearTagCache: function() {
                tagCache = {};
            },
            lockFile: function(path) {
                fileLocks[path] = Date.now();
            },
            unlockFile: function(path) {
                delete fileLocks[path];
            }
        };
    };
});
