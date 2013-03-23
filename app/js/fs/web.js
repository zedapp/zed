define(function(require, exports, module) {
    var events = require("../lib/events");

    module.exports = function(url, username, password, pollInterval) {
        pollInterval = pollInterval || 5000;
        
        var etagCache = window.etagCache =  {};
        
        function listFiles(callback) {
            $.ajax({
                type: "POST",
                url: url,
                username: username,
                password: password,
                data: {
                    action: 'filelist'
                },
                success: function(res) {
                    var items = res.split("\n");
                    for(var i = 0; i < items.length; i++) {
                        if(!items[i]) {
                            items.splice(i, 1);
                            i--;
                        }
                    }
                    callback(null, items);
                },
                error: function(xhr) {
                    callback(xhr.status);
                },
                dataType: "text"
            });
        }
    
        function readFile(path, callback) {
            $.ajax({
                type: "GET",
                url: url + path,
                username: username,
                password: password,
                error: function(xhr) {
                    callback(xhr.status);
                },
                success: function(res, status, xhr) {
                    etagCache[path] = xhr.getResponseHeader("ETag");
                    callback(null, res);
                },
                dataType: "text"
            });
        }
    
        function writeFile(path, content, callback) {
            $.ajax(url + path, {
                type: 'PUT',
                data: content,
                dataType: 'text',
                username: username,
                password: password,
                success: function(res, status, xhr) {
                    etagCache[path] = xhr.getResponseHeader("ETag");
                    callback(null, res);
                },
                error: function(xhr) {
                    callback(xhr.status || xhr.statusText);
                }
            });
        }
        
        function deleteFile(path, callback) {
            $.ajax(url + path, {
                type: 'DELETE',
                dataType: 'text',
                username: username,
                password: password,
                success: function(res) {
                    callback(null, res);
                },
                error: function(xhr) {
                    callback(xhr.status);
                }
            });
        }
        
        function getUrl(path, callback) {
            if(username) {
                var parts = url.split('://');
                url = parts[0] + '://' + username + ':' + password + '@' + parts[1];
            }
            callback(null, url + path);
        }
        
        var fileWatchers = window.fileWatchers = {};
        
        function watchFile(path, callback) {
            fileWatchers[path] = fileWatchers[path] || [];
            fileWatchers[path].push(callback);
        }
        
        function unwatchFile(path, callback) {
            fileWatchers[path].splice(fileWatchers[path].indexOf(callback), 1);
        }
        
        function pollFiles() {
            Object.keys(fileWatchers).forEach(function(path) {
                if(fileWatchers[path].length === 0)
                    return;
                
                $.ajax(url + path, {
                    type: 'OPTIONS',
                    username: username,
                    password: password,
                    success: function(data, status, xhr) {
                        var newEtag = xhr.getResponseHeader("ETag");
                        if(etagCache[path] !== newEtag) {
                            fileWatchers[path].forEach(function(fn) {
                                fn(path, "changed");
                            });
                            etagCache[path] = newEtag;
                        }
                    },
                    error: function(xhr) {
                        if(xhr.status === 404) {
                            fileWatchers[path].forEach(function(fn) {
                                fn(path, "deleted");
                            });
                            fileWatchers[path] = [];
                        }
                    }
                });
            })
        }
        
        setInterval(pollFiles, pollInterval);
        
        return {
            listFiles: listFiles,
            readFile: readFile,
            writeFile: writeFile,
            deleteFile: deleteFile,
            getUrl: getUrl,
            watchFile: watchFile,
            unwatchFile: unwatchFile
        };
    };
});
