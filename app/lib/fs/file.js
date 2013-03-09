define(function(require, exports, module) {
    var fs = requireNode("fs");
    var spawn = requireNode('child_process').spawn;
    
    module.exports = function(url) {
        function find(callback) {
            
            function walk(dir, done) {
                var results = [];
                fs.readdir(dir, function(err, list) {
                    if (err) return done(err);
                    var pending = list.length;
                    if (!pending) return done(null, results);
                    list.forEach(function(file) {
                        var path = dir + '/' + file;
                        fs.stat(path, function(err, stat) {
                            if (stat && stat.isDirectory()) {
                                walk(path, function(err, res) {
                                    results = results.concat(res);
                                    if (!--pending)
                                        done(null, results);
                                });
                            } else {
                                results.push(path);
                                if (!--pending)
                                    done(null, results);
                            }
                        });
                    });
                });
            }
        }
    
        function readFile(path, callback) {
            $.get(url + path, function(res) {
                callback(null, res);
            }, 'text');
        }
    
        function writeFile(path, content, callback) {
            $.ajax(url + '/' + path, {
                type: 'PUT',
                data: content,
                dataType: 'text',
                success: function(res) {
                    callback(null, res);
                }
            });
        }
    
        function dirname(path) {
            if(path[path.length-1] === '/')
                path = path.substring(0, path.length-1);
            var parts = path.split("/");
            return parts.slice(0, parts.length - 1).join("/");
        }
        
        function filename(path) {
            if(path[path.length-1] === '/')
                path = path.substring(0, path.length-1);
            var parts = path.split("/");
            return parts[parts.length - 1];
        }
        
        return {
            find: find,
            readFile: readFile,
            writeFile: writeFile,
            dirname: dirname,
            filename: filename
        };
    };
});
