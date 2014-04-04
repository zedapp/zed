define(function(require, exports, module) {
    plugin.consumes = ["open", "history"];
    return plugin;

    function plugin(options, imports, register) {
        var open = imports.open;
        var history = imports.history;

        var gui = nodeRequire("nw.gui");

        var args = gui.App.argv;
        if(args[0]) {
            openPath(args[0]);
        }
        gui.App.on("open", function(cmdline) {
            var args = cmdline.split(/\s+/);
            args.slice(1).forEach(function(path) {
                openPath(path);
            });
        });
        register();

        function openPath(path) {
            var url = "node:" + path;
            history.lookupProjectByUrl(url, function(err, project) {
                if(project) {
                    open.open(url, project.name);
                } else {
                    open.open(url, path);
                }
            });
        }
    }
});
