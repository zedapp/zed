define(function(require, exports, module) {
    module.exports = function(url) {
        function find(callback) {
            $.post(url, {
                action: 'filelist'
            }, function(res) {
                var items = res.split("\n");
                for(var i = 0; i < items.length; i++) {
                    if(!items[i]) {
                        items.splice(i, 1);
                        i--;
                    }
                }
                callback(null, items);
            }, 'text');
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
