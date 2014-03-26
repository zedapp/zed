var ui = require("zed/ui");
var project = require("zed/project");
var zpm = require("./zpm.js");

module.exports = function(info) {
    return ui.prompt("URI to install package from:", "", 400, 150).then(function(uri) {
        if (uri) {
            return zpm.install(uri).then(function() {
                return zpm.addToConfig(uri);
            }).then(function() {
                return project.isConfig();
            }).then(function(isConfig) {
                if (isConfig) {
                    project.reloadFileList();
                }
                return ui.prompt("Package installed successfully!", undefined, 300, 150);
            });
        }
    }).catch(function(err) {
        return ui.prompt(""+err, undefined, 300, 150);
    });
};
