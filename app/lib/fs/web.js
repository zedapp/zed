define(function(require, exports, module) {
    module.exports = function(url, username, password) {
        function filelist(callback) {
            $.ajax({
                type: "POST",
                url: url,
                username: username,
                password: password,
                data: {
                    action: 'filelist'
                },
                error: function(xhr, err, errString) {
                    callback(errString);
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
                dataType: "text"
            });
        }
    
        function readFile(path, callback) {
            $.ajax({
                type: "GET",
                url: url + path,
                username: username,
                password: password,
                error: function(xhr, err, errString) {
                    callback(errString);
                },
                success: function(res) {
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
                success: function(res) {
                    callback(null, res);
                },
                error: function(xhr, err, errString) {
                    callback(errString);
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
                error: function(xhr, err, errString) {
                    callback(errString);
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
        
        return {
            filelist: filelist,
            readFile: readFile,
            writeFile: writeFile,
            deleteFile: deleteFile,
            getUrl: getUrl
        };
    };
});