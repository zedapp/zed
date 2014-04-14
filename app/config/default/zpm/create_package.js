var ui = require("zed/ui");
var fs = require("zed/fs");
var session = require("zed/session");
var zpm = require("./zpm");

module.exports = function() {
    var uri;
    var rootPath;
    return ui.prompt("Package URI:", "gh:username/packagename", 300, 150).then(function(uri_) {
        uri = uri_;
        if (!uri_) {
            // Need to throw to jump out here
            throw new Error("no-create");
        }
        var packageJson = {
            "name": "My package",
            "uri": uri,
            "version": "1.0",
            "description": "A useful new package",
            "files": []
        };
        rootPath = zpm.uriToPath(uri);
        return fs.writeFile(rootPath + "/package.json", JSON.stringify(packageJson, null, 4));
    }).then(function() {
        return fs.writeFile(rootPath + "/config.json", "{}");
    }).then(function() {
        return fs.reloadFileList();
    }).then(function() {
        return session.goto(rootPath + "/package.json");
    }).
    catch (function(e) {
        if (e.message !== "no-create") {
            throw e;
        }
    });
};
