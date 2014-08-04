define(function(require, exports, module) {
    plugin.consumes = ["command", "ui"];
    return plugin;

    function plugin(options, imports, register) {
        var command = imports.command;
        var ui = imports.ui;

        if (process.platform === "darwin") {
            setupInstallCliCommand();
        }

        register();

        function setupInstallCliCommand() {
            var gui = nodeRequire("nw.gui");

            var rootMenu = new gui.Menu({
                type: 'menubar'
            });
            if(rootMenu.createMacBuiltin) {
                rootMenu.createMacBuiltin("Zed");
            }
            var toolsMenu = new gui.Menu();
            var toolsMenuItem = new gui.MenuItem({
                label: 'Tools',
                submenu: toolsMenu
            });
            toolsMenu.append(new gui.MenuItem({
                label: "Install CLI Tools",
                click: function() {
                    installTools();
                }
            }));
            rootMenu.append(toolsMenuItem);
            gui.Window.get().menu = rootMenu;

            command.define("Tools:Install Mac CLI", {
                doc: "Installs command-line tools for Mac to launch Zed from the command line",
                exec: installTools,
                readOnly: true
            });
        }

        function installTools() {
            var path = nodeRequire("path");
            var fs = nodeRequire("fs");
            var applicationPath = path.dirname(path.dirname(path.dirname(path.dirname(path.dirname(path.dirname(process.execPath))))));

            ui.prompt({
                message: "This will extend your ~/.profile, ~/.bash_profile, or ~/.bashrc PATH variable to include Zed. Proceed?"
            }).then(function(yes) {
                if(!yes) {
                    return;
                }
                // Determine startup file to add to
                var HOME = process.env.HOME;
                var rcFile = HOME + "/.profile";
                if (fs.existsSync(HOME + "/.bash_profile")) {
                    rcFile = HOME + "/.bash_profile";
                } else if (fs.existsSync(HOME + "/.bashrc")) {
                    rcFile = HOME + "/.bashrc";
                }
                try {
                    fs.appendFileSync(rcFile, "\nexport PATH=\"" + applicationPath + "/bin\":$PATH\n");
                    ui.prompt({
                        message: "Installed! Open a fresh terminal and start using the 'zed' command!"
                    });
                } catch (e) {
                    ui.prompt({
                        message: "Could not write to " + rcFile
                    });
                }
            });
        }
    }
});
