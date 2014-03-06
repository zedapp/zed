var ui = require("zed/ui");
var project = require("zed/project");
var zpm = require("./zpm.js");

module.exports = function(info, callback) {
    ui.prompt("URI to install package from:", "", 400, 150, function(err, uri) {
        if (uri) {
            zpm.install(uri, function(err) {
                if (err) {
                    ui.prompt(err, undefined, 300, 150, function() {});
                    return callback(err);
                }
                zpm.addToConfig(uri, function(err) {
                    if (err) {
                        ui.prompt(err, undefined, 300, 150, function() {});
                        return callback(err);
                    }
                    project.isConfig(function(err, isConfig) {
                        if (isConfig) {
                            project.reloadFileList();
                        }
                    });
                    ui.prompt("Package installed successfully!", undefined, 300, 150, function() {
                        callback();
                    });

                });
            });
        }
    });
};