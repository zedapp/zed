define(function(require, exports, module) {
    module.exports = function(url) {
        function filelist(callback) {
            $.ajax({
                type: "POST",
                url: url,
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
                success: function(res) {
                    callback(null, res);
                },
                error: function(xhr, err, errString) {
                    callback(errString);
                }
            });
        }    
        return {
            filelist: filelist,
            readFile: readFile,
            writeFile: writeFile,
            deleteFile: deleteFile
        };
    };
});
