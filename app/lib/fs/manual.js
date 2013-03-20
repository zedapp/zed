define(function(require, exports, module) {
    var root = "manual";
    module.exports = {
        listFiles: function(callback) {
            $.get(root+"/all", function(res) {
                var items = res.split("\n");
                for(var i = 0; i < items.length; i++) {
                    if(!items[i]) {
                        items.splice(i, 1);
                        i--;
                    }
                }
                callback(null, items);
            }, "text");
        },
        readFile: function(path, callback) {
            if(path === "/.zedstate") {
                return callback(null, '{"session.current": ["/index.md"]}');
            }
            $.ajax({
                url: root+path,
                dataType: "text",
                success: function(text) {
                    callback(null, text, {readOnly: true});
                },
                error: function(xhr) {
                    callback(xhr.status);
                }
            });
        },
        writeFile: function(path, content, callback) {
            callback(405); // Method not allowed
        },
        deleteFile: function(path, callback) {
            callback(405); // Method not allowed
        },
        getUrl: function(path, callback) {
            callback(null, root + path);
        },
        watchFile: function() {
            // Nop
        },
        unwatchFile: function() {
            // Nop
        }
    };
});