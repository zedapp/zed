var session = require("zed/session");
var zpm = require("./zpm.js");

module.exports = function() {
    return session.goto("zed::zpm::installed").then(function() {
        return zpm.getInstalledPackages();
    }).then(function(packages) {
        session.setText("zed::zpm::installed", "Installed packages\n==================\n");
        append("\nCommands: [Install New]      [Update All]\n");
        var pkg;
        if (Object.keys(packages).length === 0) {
            append("\nYou do not have any packages installed.\n", function() {});
        } else {
            for (var id in packages) {
                pkg = packages[id];
                append("\n" + pkg.name + "\n");
                append("URI: " + id + "\n");
                append("Version: " + pkg.version + "\n");
                append("Description: " + pkg.description + "\n");
                append("Commands: [Uninstall]      [Update]\n");
            }
        }
        return session.setCursorPosition("zed::zpm::installed", {
            row: 0,
            column: 0
        });
    });

    function append(text) {
        session.append("zed::zpm::installed", text);
    }
};
