var fs = require("zed/fs");
var session = require("zed/session");

module.exports = function(info) {
    var path = info.path;
    var json;
    return session.getText(path).then(function(text) {
        try {
            json = JSON.parse(text);
        } catch (e) {
            return console.error("Could not parse package.json");
        }
        return fs.listFiles();
    }).then(function(files) {
        var packageFiles = [];
        var packageRoot = path.split("/").slice(0, -1).join("/");
        files.forEach(function(path) {
            if (path.indexOf(packageRoot) === 0) {
                var filename = path.substring(packageRoot.length + 1);
                if (filename !== "package.json" && filename !== "config.json") {
                    packageFiles.push(filename);
                }
            }
        });
        json.files = packageFiles;
        return session.setText(path, JSON.stringify(json, null, 4));
    });
};
