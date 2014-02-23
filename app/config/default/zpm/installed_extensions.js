define(function(require, exports, module) {
    var session = require("zed/session");
    var zpm = require("zed/zpm");

    return function(info, callback) {
        session.goto("zed::zpm::installed", function() {
            function append(text) {
                session.append("zed::zpm::installed", text, function() {});
            }

            append("This is a list of your installed extensions. \nPut your cursor on a command and press Enter to execute it.\n\n");
            zpm.getInstalledExtensions(function(err, extensions) {
                var extension;
                for (var id in extensions) {
                    extension = extensions[id];
                    append(extension.name + " (" + id + ")\n");
                    append("Version: " + extension.version + "\n");
                    append("URL: " + extension.url + "\n");
                    append("Description: " + extension.description + "\n\n");
                    append("Uninstall\n");
                }
            });
        });
    };
});