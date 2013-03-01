define(function(require, exports, module) {
    var config = require("config");

    function find(callback) {
        $.post(config.get('url'), {
            action: 'find'
        }, function(res) {
            callback(null, res.split("\n"));
        }, 'text');
    }

    function readFile(path, callback) {
        $.get(config.get('url') + '/' + path, function(res) {
            callback(null, res);
        }, 'text');
    }

    function writeFile(path, content, callback) {
        $.ajax(config.get('url') + '/' + path, {
            type: 'PUT',
            data: content,
            dataType: 'text',
            success: function(res) {
                callback(null, res);
            }
        });
    }

    exports.find = find;
    exports.readFile = readFile;
    exports.writeFile = writeFile;
});
