define(function(require, exports, module) {
    plugin.consumes = ["open_ui", "history"];
    return plugin;

    function plugin(options, imports, register) {
        var openUi = imports.open_ui;
        var history = imports.history;

        var gui = nodeRequire("nw.gui");
        var options = require("./lib/options");

        // gui.Window.get().showDevTools();

        if(!options.get("cli")) {
            return register();
        }

        var args = gui.App.argv;
        console.log("ARGS", args);
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
            if(openUi.ignore) {
                return;
            }
            console.log("Opening", path);
            openUi.close();
            var url = "node:" + path;
            if(path.indexOf("http://") === 0 || path.indexOf("https://") === 0) {
                url = path;
            }
            history.lookupProjectByUrl(url).then(function(project) {
                // setTimeout(function() {
                    if (project) {
                        openUi.open(project.name, url);
                    } else {
                        openUi.open(path, url);
                    }

                // }, 1000);
            });
        }
    }
});
