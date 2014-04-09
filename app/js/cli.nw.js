define(function(require, exports, module) {
    plugin.consumes = ["open", "history"];
    return plugin;

    function plugin(options, imports, register) {
        var open = imports.open;
        var history = imports.history;

        var gui = nodeRequire("nw.gui");

        // gui.Window.get().showDevTools();

        var args = gui.App.argv;
        if (args[0]) {
            openPath(args[0]);
        }
        gui.App.on("open", function(cmdline) {
            console.log("Got open event", cmdline);
            var args = cmdline.split(/\s+/);
            if (process.platform !== "darwin") {
                args = args.splice(1);
            }
            args.forEach(function(path) {
                openPath(path);
            });
        });

        register();

        function openPath(path) {
            var url = "node:" + path;
            history.lookupProjectByUrl(url, function(err, project) {
                if (project) {
                    open.open(url, project.name);
                } else {
                    open.open(url, path);
                }
            });
        }
    }
});
