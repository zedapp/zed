define(function () {
    plugin.consumes = ["config"];
    plugin.provides = ["io"];
    return plugin;


    function plugin(options, imports, register) {
        var config = imports.config;

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

        register(null, {
            io: {
                find: find,
                readFile: readFile,
                writeFile: writeFile
            }
        });
    }
});
