define(function(require, exports, module) {
    return function(fs, pollInterval) {
        var tagCache = {};
        var fileWatchers = {};

        function pollFiles() {
            Object.keys(fileWatchers).forEach(function(path) {
                if (fileWatchers[path].length === 0) {
                    return;
                }
                
                fs.getCacheTag(path, function(err, tag) {
                    if(err) {
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
                        
                    } else {
                        if (tagCache[path] !== tag) {
                            fileWatchers[path].forEach(function(fn) {
                                fn(path, "changed");
                            });
                            tagCache[path] = tag;
                        }
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
                fileWatchers[path].splice(fileWatchers[path].indexOf(callback), 1);
            },
            setCacheTag: function(path, tag) {
                tagCache[path] = tag;
            }
        };
    };
});