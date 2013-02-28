define(function () {
    plugin.consumes = ["config", "io", "editor"];
    plugin.provides = ["session_manager"];
    return plugin;

    function plugin(options, imports, register) {
        var io = imports.io;
        var editor = imports.editor;
        var buffers = {};

        function go(path) {
            if(buffers[path]) {
                show(buffers[path]);
            } else {
                console.log("Going to load", path);
                io.readFile(path, function(err, text) {
                    var session = editor.createSession(path, text);
                    session.filename = path;
                    var saveTimer = null;
                    session.on('change', function() {
                        if(saveTimer)
                            clearTimeout(saveTimer);
                        saveTimer = setTimeout(function() {
                            console.log("Saving");
                            io.writeFile(path, session.getValue(), function(err, res) {
                                console.log("Result:", res);
                            });
                        }, 1000);
                    });
                    buffers[path] = session;
                    show(session);
                });
            }
            function show(session) {
                editor.switchSession(session);
            }
        }
        register(null, {
            session_manager: {
                go: go
            }
        });
    }
});
