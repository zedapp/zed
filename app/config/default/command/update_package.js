var project = require("zed/project");
var session = require("zed/session");

module.exports = function(info, callback) {
    var path = info.path;
    session.getText(path, function(err, text) {
        var json;
        try {
            json = JSON.parse(text);
        } catch(e) {
            return console.error("Could not parse package.json");
        }
        project.listFiles(function(err, files) {
            var packageFiles = [];
            var packageRoot = path.split("/").slice(0, -1).join("/");
            files.forEach(function(path) {
                if(path.indexOf(packageRoot) === 0) {
                    var filename = path.substring(packageRoot.length + 1);
                    if(filename !== "package.json" && filename !== "config.json") {
                        packageFiles.push(filename);
                    }
                }
            });
            json.files = packageFiles;
            session.setText(path, JSON.stringify(json, null, 4), callback);
        });
    });
};