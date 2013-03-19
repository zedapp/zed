define(function(require, exports, module) {
    var root = "manual";
    module.exports = {
        filelist: function(callback) {
            $.get(root+"/all.json", function(docs) {
                console.log(docs);
                callback(null, docs);
            }, "json");
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