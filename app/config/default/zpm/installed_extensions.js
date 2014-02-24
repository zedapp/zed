define(function(require, exports, module) {
    var session = require("zed/session");
    var zpm = require("zed/zpm");
    
    return function(info, callback) {
        session.goto("zed::zpm::installed", function() {
            function append(text) {
                session.append("zed::zpm::installed", text, function() {});
            }

            zpm.getInstalledExtensions(function(err, extensions) {
                if (Object.keys(extensions).length === 0) {
                    session.setText("zed::zpm::installed", "You do not have any extensions installed.\n", function() {});
                    return;
                }
                session.setText("zed::zpm::installed", "This is a list of your installed extensions. \nPut your cursor on a command and press Enter to execute it.\n", function() {});
                append("\nCommand: Update All\n");
                var extension;
                for (var id in extensions) {
                    extension = extensions[id];
                    append("\n" + extension.name + "\n");
                    append("ID: " + id + "\n");
                    append("Version: " + extension.version + "\n");
                    append("URL: " + extension.url + "\n");
                    append("Description: " + extension.description + "\n");
                    append("Commands: Uninstall      Update      ");
                    if (extension.autoUpdate) {
                        append("Turn Off Automatic Updates\n");
                    } else {
                        append("Turn On Automatic Updates\n");
                    }
                }
                session.setCursorPosition("zed::zpm::installed", {
                    row: 0,
                    column: 0
                }, function() {});
            });
        });
    };
});