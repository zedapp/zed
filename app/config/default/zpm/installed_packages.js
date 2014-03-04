var session = require("zed/session");
var zpm = require("./zpm.js");

module.exports = function() {
    session.goto("zed::zpm::installed", function() {
        function append(text) {
            session.append("zed::zpm::installed", text, function() {});
        }

        zpm.getInstalledPackages(function(err, packages) {

            session.setText("zed::zpm::installed", "This is a list of your installed packages. \nPut your cursor on a command and press Enter to execute it.\n", function() {});
            append("\nCommands: [Install New]      [Update All]\n");
            var pkg;
            if (Object.keys(packages).length === 0) {
                append("\nYou do not have any packages installed.\n", function() {});
            } else {
                for (var id in packages) {
                    pkg = packages[id];
                    append("\n" + pkg.name + "\n");
                    append("ID: " + id + "\n");
                    append("Version: " + pkg.version + "\n");
                    append("URL: " + pkg.url + "\n");
                    append("Description: " + pkg.description + "\n");
                    append("Commands: [Uninstall]      [Update]      ");
                    if (pkg.autoUpdate) {
                        append("[Turn Off Automatic Updates]\n");
                    } else {
                        append("[Turn On Automatic Updates]\n");
                    }
                }
            }
            session.setCursorPosition("zed::zpm::installed", {
                row: 0,
                column: 0
            }, function() {});
        });
    });
};