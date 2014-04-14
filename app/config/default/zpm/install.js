var ui = require("zed/ui");
var fs = require("zed/fs");
var zpm = require("./zpm.js");

module.exports = function() {
    return ui.prompt("URI to install package from:", "", 400, 150).then(function(uri) {
        if (uri) {
            return zpm.install(uri).then(function() {
                return zpm.addToConfig(uri);
            }).then(function() {
                return fs.isConfig();
            }).then(function(isConfig) {
                if (isConfig) {
                    fs.reloadFileList();
                }
                return ui.prompt("Package installed successfully!", undefined, 300, 150);
            });
        }
    }).catch(function(err) {
        return ui.prompt(""+err, undefined, 300, 150);
    });
};
